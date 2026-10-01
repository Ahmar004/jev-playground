// @vitest-environment node
import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { recordingSchema, type Recording } from '@/content/recording-schema'
import { readRecordedHash, recordedSpend, recordingPath, writeRecording } from './files'

const HASH = 'a'.repeat(64)

function recording(overrides: Partial<Recording> = {}): Recording {
	return recordingSchema.parse({
		taskId: 'demo',
		taskHash: HASH,
		racer: 'llm',
		modelId: 'claude-opus-5-5',
		recordedAt: '2026-10-01T12:00:00.000Z',
		price: { inputPerM: 4, outputPerM: 20, source: 'https://example.com/pricing' },
		lanes: 4,
		events: [
			{
				itemId: 'i1',
				ok: true,
				raw: '{"answer":"a"}',
				parsed: 'a',
				credit: 1,
				correct: true,
				latencyMs: 10,
				usage: { inputTokens: 1, outputTokens: 1 },
				costUsd: 0.25,
				lane: 0,
				startMs: 0,
				endMs: 10
			}
		],
		totals: {
			items: 1,
			scored: 1,
			correct: 1,
			accuracy: 1,
			wallMs: 10,
			costUsd: 0.25,
			inputTokens: 1,
			outputTokens: 1,
			parseFailures: 0
		},
		...overrides
	})
}

let root: string
beforeEach(() => {
	root = mkdtempSync(join(tmpdir(), 'record-'))
})
afterEach(() => {
	rmSync(root, { recursive: true, force: true })
})

describe('recording files', () => {
	it('writes to content/recordings/<taskId>/<slug>.json, formatted and valid', async () => {
		const path = await writeRecording(root, recording())
		expect(path).toBe(recordingPath(root, 'demo', 'claude-opus-5-5'))
		const text = readFileSync(path, 'utf8')
		expect(text.endsWith('\n')).toBe(true)
		expect(text).toContain('\t"taskId": "demo"')
		expect(recordingSchema.parse(JSON.parse(text))).toEqual(recording())
	})

	it('reads the stored hash, or null when there is no file', async () => {
		expect(readRecordedHash(root, 'demo', 'claude-opus-5-5')).toBeNull()
		await writeRecording(root, recording())
		expect(readRecordedHash(root, 'demo', 'claude-opus-5-5')).toBe(HASH)
	})

	it('sums the cost of every LLM recording on disk, leaving Jev out', async () => {
		await writeRecording(root, recording())
		await writeRecording(root, recording({ racer: 'jev', modelId: 'jev-1.13.0' }))
		await writeRecording(root, recording({ taskId: 'other' }))
		await writeRecording(
			root,
			recording({ taskId: 'third', totals: { ...recording().totals, costUsd: null } })
		)
		expect(recordedSpend(root)).toEqual({ costUsd: 0.5, unknownPriceFiles: 1 })
	})

	it('reports zero spend when there are no recordings', () => {
		expect(recordedSpend(root)).toEqual({ costUsd: 0, unknownPriceFiles: 0 })
	})
})
