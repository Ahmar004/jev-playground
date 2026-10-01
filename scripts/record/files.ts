import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { format, resolveConfig } from 'prettier'
import { z } from 'zod'
import { recordingSlug, type Recording } from '@/content/recording-schema'

// The total spend allowed for the whole project (ROADMAP Rule-0.1).
export const BUDGET_USD = 50

const RECORDINGS_DIR = ['content', 'recordings']
const JSON_EXT = '.json'

export function recordingPath(root: string, taskId: string, slug: string): string {
	return join(root, ...RECORDINGS_DIR, taskId, `${slug}${JSON_EXT}`)
}

const hashOnlySchema = z.object({ taskHash: z.string() })
const costOnlySchema = z.object({ totals: z.object({ costUsd: z.number().nullable() }) })

export function readRecordedHash(root: string, taskId: string, slug: string): string | null {
	const path = recordingPath(root, taskId, slug)
	if (!existsSync(path)) return null
	return hashOnlySchema.parse(JSON.parse(readFileSync(path, 'utf8'))).taskHash
}

/** Writes the recording, formatted by the repo's Prettier config so format:check passes. */
export async function writeRecording(root: string, recording: Recording): Promise<string> {
	const path = recordingPath(root, recording.taskId, recordingSlug(recording))
	// The repo's own config, found from this file, so a root outside the repo formats the same.
	const config = (await resolveConfig(fileURLToPath(import.meta.url))) ?? {}
	const text = await format(JSON.stringify(recording), { ...config, filepath: path })
	mkdirSync(dirname(path), { recursive: true })
	writeFileSync(path, text)
	return path
}

/** What every recording on disk cost, against BUDGET_USD. */
export function recordedSpend(root: string): { costUsd: number; unknownPriceFiles: number } {
	const dir = join(root, ...RECORDINGS_DIR)
	if (!existsSync(dir)) return { costUsd: 0, unknownPriceFiles: 0 }
	let costUsd = 0
	let unknownPriceFiles = 0
	const files = readdirSync(dir, { recursive: true, encoding: 'utf8' }).filter((file) =>
		file.endsWith(JSON_EXT)
	)
	for (const file of files) {
		const { totals } = costOnlySchema.parse(JSON.parse(readFileSync(join(dir, file), 'utf8')))
		if (totals.costUsd === null) unknownPriceFiles += 1
		else costUsd += totals.costUsd
	}
	return { costUsd, unknownPriceFiles }
}
