import { taskSchema, type Question, type Task } from '@/content/task-schema'
import { QUESTION_KINDS, TASK_KINDS } from '@/lib/constants'

export const CUSTOM_KINDS = [
	QUESTION_KINDS.noul,
	QUESTION_KINDS.choice,
	QUESTION_KINDS.score
] as const
export type CustomKind = (typeof CUSTOM_KINDS)[number]

export const CUSTOM_KIND_LABELS: Record<CustomKind, string> = {
	[QUESTION_KINDS.noul]: 'Yes or no (Noul)',
	[QUESTION_KINDS.choice]: 'One of several options (Choice)',
	[QUESTION_KINDS.score]: 'A level on a scale (Score)'
}

export const CUSTOM_TASK_ID = 'custom'
const CUSTOM_ITEM_ID = 'custom'
// Limits shared with the snapshot a share stores (snapshot.ts).
export const MAX_STATE_CHARS = 8000
export const MAX_QUESTION_CHARS = 2000

export type CustomTaskInput = { kind: CustomKind; state: string; question: string; options: string }
export type TaskBuild = { ok: true; task: Task } | { ok: false; error: string }

function lines(text: string): string[] {
	return text
		.split('\n')
		.map((line) => line.trim())
		.filter((line) => line !== '')
}

function questionFor(input: CustomTaskInput): Question | string {
	const instructions = input.question.trim()
	const entries = lines(input.options)
	switch (input.kind) {
		case QUESTION_KINDS.noul:
			return { type: QUESTION_KINDS.noul, instructions }
		case QUESTION_KINDS.choice: {
			if (new Set(entries).size !== entries.length) return 'Each option must be different.'
			return {
				type: QUESTION_KINDS.choice,
				instructions,
				criteria: Object.fromEntries(entries.map((entry) => [entry, null]))
			}
		}
		case QUESTION_KINDS.score:
			return { type: QUESTION_KINDS.score, instructions, criteria: entries }
	}
}

/**
 * The user's own task for a live run: some text and one question. It has no
 * stored answer, so its results show "not scored" (DESIGN 3.2). Checked
 * against the same Task rules as built-in content.
 */
export function buildCustomTask(input: CustomTaskInput): TaskBuild {
	const state = input.state.trim()
	if (state === '') return { ok: false, error: 'Write the text Jev should look at.' }
	if (input.question.trim() === '') return { ok: false, error: 'Write the question to answer.' }
	if (state.length > MAX_STATE_CHARS) {
		return {
			ok: false,
			error: `The text is too long to share or run here (over ${MAX_STATE_CHARS} characters).`
		}
	}
	if (input.question.length > MAX_QUESTION_CHARS) {
		return { ok: false, error: `The question is over ${MAX_QUESTION_CHARS} characters.` }
	}
	const question = questionFor(input)
	if (typeof question === 'string') return { ok: false, error: question }
	const parsed = taskSchema.safeParse({
		id: CUSTOM_TASK_ID,
		kind: TASK_KINDS[input.kind],
		version: 1,
		jev: { questions: { answer: question } },
		items: [{ id: CUSTOM_ITEM_ID, state }]
	})
	if (parsed.success) return { ok: true, task: parsed.data }
	const message = parsed.error.issues[0]?.message ?? 'That task is not valid.'
	return { ok: false, error: message }
}

/** A preset's task with the user's edited text as its state. An object state is edited as JSON. */
export function withEditedState(task: Task, text: string): TaskBuild {
	const item = task.items[0]
	if (!item) return { ok: false, error: 'This preset has no item.' }
	const trimmed = text.trim()
	if (trimmed === '') return { ok: false, error: 'The input cannot be empty.' }
	if (trimmed.length > MAX_STATE_CHARS) {
		return { ok: false, error: `The input is over ${MAX_STATE_CHARS} characters.` }
	}
	// The stored answer belongs to the original input, so an edited one is not scored. An input
	// still equal to the preset's own (as text, or as the same JSON) keeps it and is scored.
	const unscored = (state: unknown) => {
		if (JSON.stringify(state) === JSON.stringify(item.state)) return task
		const edited: Record<string, unknown> = { ...item, state }
		delete edited.label
		return { ...task, items: [edited] }
	}
	if (typeof item.state === 'string') {
		return { ok: true, task: taskSchema.parse(unscored(trimmed)) }
	}
	try {
		const state: unknown = JSON.parse(trimmed)
		const checked = taskSchema.safeParse(unscored(state))
		return checked.success
			? { ok: true, task: checked.data }
			: { ok: false, error: 'That input does not fit this preset.' }
	} catch {
		return { ok: false, error: 'This input is JSON. Check for a missing quote or comma.' }
	}
}
