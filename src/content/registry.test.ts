import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { z } from 'zod'
import { CLAUDE_MODELS, RACERS } from '@/lib/constants'
import { PRESETS } from './arena'
import { GAMES } from './games'
import { LEVELS } from './levels'
import { recordingSlug } from './recording-schema'
import { currentRecordings, RECORDINGS } from './recordings'
import { TASKS } from './tasks'

const CONTENT = join(process.cwd(), 'content')
const TASKS_DIR = join(CONTENT, 'tasks')
const RECORDINGS_DIR = join(CONTENT, 'recordings')
const LEVELS_DIR = join(CONTENT, 'levels')
const GAMES_DIR = join(CONTENT, 'games')

function jsonFiles(dir: string): string[] {
	if (!existsSync(dir)) return []
	return readdirSync(dir, { recursive: true, encoding: 'utf8' })
		.filter((file) => file.endsWith('.json'))
		.map((file) => file.replaceAll('\\', '/'))
}

describe('content registries', () => {
	it('imports every task file, keyed by its id', () => {
		const ids = jsonFiles(TASKS_DIR).map((file) => {
			const parsed: unknown = JSON.parse(readFileSync(join(TASKS_DIR, file), 'utf8'))
			const id = z.object({ id: z.string() }).parse(parsed).id
			expect(file).toBe(`${id}.json`)
			return id
		})
		expect([...TASKS.keys()].sort()).toEqual(ids.sort())
	})

	it('imports every level file, keyed by its id', () => {
		const ids = jsonFiles(LEVELS_DIR).map((file) => {
			const parsed: unknown = JSON.parse(readFileSync(join(LEVELS_DIR, file), 'utf8'))
			const id = z.object({ id: z.string() }).parse(parsed).id
			expect(file).toBe(`${id}.json`)
			return id
		})
		expect([...LEVELS.keys()].sort()).toEqual(ids.sort())
	})

	it('imports every game file, keyed by its id', () => {
		const ids = jsonFiles(GAMES_DIR).map((file) => {
			const parsed: unknown = JSON.parse(readFileSync(join(GAMES_DIR, file), 'utf8'))
			const id = z.object({ id: z.string() }).parse(parsed).id
			expect(file).toBe(`${id}.json`)
			return id
		})
		expect([...GAMES.keys()].sort()).toEqual(ids.sort())
	})

	it('imports every Arena preset in content/arena/presets.json', () => {
		const parsed: unknown = JSON.parse(readFileSync(join(CONTENT, 'arena', 'presets.json'), 'utf8'))
		const ids = z
			.array(z.object({ id: z.string() }))
			.parse(parsed)
			.map((preset) => preset.id)
		expect([...PRESETS.keys()]).toEqual(ids)
	})

	it('imports every recording file at content/recordings/<taskId>/<slug>.json', () => {
		const onDisk = jsonFiles(RECORDINGS_DIR).sort()
		const imported = RECORDINGS.map(
			(recording) => `${recording.taskId}/${recordingSlug(recording)}.json`
		).sort()
		expect(imported).toEqual(onDisk)
	})

	it('has a current recording for Jev and all three Claude models for every task', () => {
		for (const taskId of TASKS.keys()) {
			const slugs = currentRecordings(taskId).map(recordingSlug)
			for (const slug of [RACERS.jev, ...Object.values(CLAUDE_MODELS)]) {
				expect(slugs, `${taskId} needs a current ${slug} recording`).toContain(slug)
			}
		}
	})
})
