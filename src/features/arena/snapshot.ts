import { z } from 'zod'
import type { ArenaPreset } from '@/content/arena-schema'
import { answerQuestion, type Structured, type Task } from '@/content/task-schema'
import { MODES, RACERS, SHARE_LIMITS } from '@/lib/constants'
import { itemResultSchema } from '@/runner/types'

const MAX_RAW_CHARS = 8000
const MAX_STATE_CHARS = 8000
const MAX_QUESTION_CHARS = 2000

// One racer's result for the Arena's single item: where it came from (the
// recording date, or the start of a live run) and the runner's ItemResult.
export const arenaSideSchema = z.strictObject({
	racer: z.enum([RACERS.jev, RACERS.llm]),
	modelId: z.string().min(1).max(200),
	at: z.iso.datetime(),
	result: itemResultSchema.extend({ raw: z.string().max(MAX_RAW_CHARS) })
})
export type ArenaSide = z.infer<typeof arenaSideSchema>
export type ArenaRacer = ArenaSide['racer']

// What a share stores and /s/<id> renders: plain text and numbers only (R86).
export const arenaSnapshotSchema = z
	.strictObject({
		mode: z.enum([MODES.beginner, MODES.developer]),
		title: z.string().min(1).max(120),
		// Absent for a custom task.
		presetId: z.string().min(1).max(80).optional(),
		question: z.string().min(1).max(MAX_QUESTION_CHARS),
		state: z.string().min(1).max(MAX_STATE_CHARS),
		// The stored answer, only while the input is the preset's own.
		expected: z.string().min(1).max(500).optional(),
		sides: z.array(arenaSideSchema).min(1).max(2)
	})
	.refine(
		(snapshot) =>
			new TextEncoder().encode(JSON.stringify(snapshot)).length <= SHARE_LIMITS.maxBytes,
		'The result is too large to share.'
	)
export type ArenaSnapshot = z.infer<typeof arenaSnapshotSchema>

/** What the Arena page needs for one preset, built on the server from the Recordings. */
export type ArenaPresetView = {
	preset: ArenaPreset
	// The preset's task cut down to its one item: the live run starts from it.
	task: Task
	question: string
	state: string
	expected: string | null
	jev: ArenaSide | null
	opponents: ArenaSide[]
	// The size of the whole task when it can run as a batch (R45), else null.
	batchItems: number | null
}

/** An item's state as plain text: a string as it is, anything else as indented JSON. */
export function stateText(state: Structured): string {
	return typeof state === 'string' ? state : JSON.stringify(state, null, 2)
}

/** The question the racers answer, as plain text. A fan_out lists its questions. */
export function questionText(task: Task): string {
	const single = answerQuestion(task)
	if (single) return stateText(single.instructions)
	const item = task.items[0]
	const questions = item?.questions ?? ('questions' in task.jev ? task.jev.questions : null)
	if (!questions) return 'Answer the question about this item.'
	return Object.values(questions)
		.map((question) => stateText(question.instructions))
		.join('\n')
}
