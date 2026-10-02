import 'server-only'
import presets from '../../content/arena/presets.json'
import {
	arenaSideSchema,
	questionText,
	stateText,
	type ArenaPresetView,
	type ArenaSide
} from '@/features/arena/snapshot'
import { ARENA_BATCH_MIN_ITEMS } from '@/lib/constants'
import { raceLineup } from '@/features/levels/lineup'
import { valueText } from '@/features/race/answer-text'
import { arenaPresetSchema, type ArenaPreset } from './arena-schema'
import { currentRecordings } from './recordings'
import type { Recording } from './recording-schema'
import type { Task } from './task-schema'
import { TASKS } from './tasks'

/** Parses the presets and checks that each names a real task and item, keyed by id in listed order. */
export function buildPresetMap(raw: unknown[]): ReadonlyMap<string, ArenaPreset> {
	const map = new Map<string, ArenaPreset>()
	for (const entry of raw) {
		const preset = arenaPresetSchema.parse(entry)
		if (map.has(preset.id)) throw new Error(`Duplicate preset id: ${preset.id}`)
		const task = TASKS.get(preset.taskId)
		if (!task) throw new Error(`Preset ${preset.id} uses unknown task ${preset.taskId}`)
		if (!task.items.some((item) => item.id === preset.itemId)) {
			throw new Error(`Preset ${preset.id} uses unknown item ${preset.itemId}`)
		}
		map.set(preset.id, preset)
	}
	return map
}

export const PRESETS = buildPresetMap(presets)

// The recorded result for the preset's item, with where it came from.
export function sideOf(recording: Recording, itemId: string): ArenaSide | null {
	const event = recording.events.find((candidate) => candidate.itemId === itemId)
	if (!event) return null
	return arenaSideSchema.parse({
		racer: recording.racer,
		modelId: recording.modelId,
		at: recording.recordedAt,
		result: event
	})
}

function isBatchable(task: Task): boolean {
	return task.items.length >= ARENA_BATCH_MIN_ITEMS
}

function viewOf(preset: ArenaPreset): ArenaPresetView {
	const task = TASKS.get(preset.taskId)
	const item = task?.items.find((candidate) => candidate.id === preset.itemId)
	if (!task || !item) throw new Error(`Preset ${preset.id} lost its item`)
	const single = { ...task, items: [item] }
	const { jev, opponents } = raceLineup(currentRecordings(task.id))
	return {
		preset,
		task: single,
		question: questionText(single),
		state: stateText(item.state),
		expected: item.label === undefined ? null : valueText(item.label),
		jev: jev ? sideOf(jev, item.id) : null,
		opponents: opponents.flatMap((recording) => sideOf(recording, item.id) ?? []),
		batchItems: isBatchable(task) ? task.items.length : null
	}
}

/** Every preset with its recorded sides, for the Arena page. Only each preset's own item reaches the client (R79). */
export function presetViews(): ArenaPresetView[] {
	return [...PRESETS.values()].map(viewOf)
}

/** One preset's view, or undefined when the id is unknown. */
export function presetView(presetId: string): ArenaPresetView | undefined {
	const preset = PRESETS.get(presetId)
	return preset ? viewOf(preset) : undefined
}

/** The ids of the presets that can run as a batch (R45). */
export function batchPresetIds(): string[] {
	return [...PRESETS.values()]
		.filter((preset) => {
			const task = TASKS.get(preset.taskId)
			return task !== undefined && isBatchable(task)
		})
		.map((preset) => preset.id)
}

/** A batchable preset with its whole task and recordings, or undefined. Only this task's recordings reach the client (R79). */
export function batchView(
	presetId: string
): { preset: ArenaPreset; task: Task; recordings: Recording[] } | undefined {
	const preset = PRESETS.get(presetId)
	const task = preset ? TASKS.get(preset.taskId) : undefined
	if (!preset || !task || !isBatchable(task)) return undefined
	return { preset, task, recordings: currentRecordings(task.id) }
}
