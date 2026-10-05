import { z } from 'zod'
import {
	questionSchema,
	structuredSchema,
	taskSchema,
	type Question,
	type Structured,
	type Task
} from '@/content/task-schema'
import { JEV_MODEL_ALIAS, QUESTION_KINDS, TASK_KINDS, type QuestionKind } from '@/lib/constants'
import type { TaskBuild } from '@/features/arena/custom-task'

// The one object the Form and the JSON view both edit (R48). Neither view
// keeps its own copy of the setup, so they cannot drift.
export type SandboxQuestion = { id: string; name: string; question: Question }
// An empty state is a setup that is not ready to send yet.
export type SandboxDoc = { state: Structured | ''; questions: SandboxQuestion[] }

export const SANDBOX_TASK_ID = 'sandbox'
const SANDBOX_ITEM_ID = 'sandbox'
const JSON_START = /^[{[]/

/** A value as plain text: a string as it is, anything else as indented JSON. */
export function textOf(value: unknown): string {
	return typeof value === 'string' ? value : (JSON.stringify(value, null, 2) ?? '')
}

/** Text the user typed as a value: valid JSON that starts with { or [ is structured, the rest stays text. */
export function structuredOf(text: string): Structured | '' {
	if (JSON_START.test(text.trim())) {
		try {
			const parsed = structuredSchema.safeParse(JSON.parse(text))
			if (parsed.success) return parsed.data
		} catch {
			// Not JSON yet: keep the text as typed.
		}
	}
	return text
}

function lines(text: string): string[] {
	return text
		.split('\n')
		.map((line) => line.trim())
		.filter((line) => line !== '')
}

/** The options or levels of a question, one per line; a Noul has none. */
export function optionsText(question: Question): string {
	if (question.type === QUESTION_KINDS.choice) return Object.keys(question.criteria).join('\n')
	if (question.type === QUESTION_KINDS.score) return question.criteria.map(textOf).join('\n')
	return ''
}

/** The same question with its options or levels replaced from text. Choice keeps the descriptions of options that stay. */
export function withOptions(question: Question, text: string): Question {
	const entries = lines(text)
	if (question.type === QUESTION_KINDS.choice) {
		const criteria = Object.fromEntries(
			entries.map((entry) => [entry, question.criteria[entry] ?? null])
		)
		return { ...question, criteria }
	}
	if (question.type === QUESTION_KINDS.score) {
		const criteria = entries.map((entry) => {
			const value = structuredOf(entry)
			return value === '' ? entry : value
		})
		return { ...question, criteria }
	}
	return question
}

/** The two answers a Noul can describe. */
export type NoulAnswer = 'true' | 'false'

/** What a Noul's criterion for one answer says, as text; empty when it has none. */
export function criterionText(question: Question, answer: NoulAnswer): string {
	if (question.type !== QUESTION_KINDS.noul) return ''
	const value = question.criteria?.[answer]
	return value === undefined ? '' : textOf(value)
}

/** The same Noul with one answer's criterion set from text; a blank text removes it, and no criteria at all removes the key. */
export function withCriterion(question: Question, answer: NoulAnswer, text: string): Question {
	if (question.type !== QUESTION_KINDS.noul) return question
	const { criteria: current, ...rest } = question
	const criteria = { ...current }
	if (text.trim() === '') delete criteria[answer]
	else criteria[answer] = structuredOf(text)
	return Object.keys(criteria).length === 0 ? rest : { ...rest, criteria }
}

/** What a Choice option's description says, as text; empty when it has none. */
export function optionDescriptionText(question: Question, option: string): string {
	if (question.type !== QUESTION_KINDS.choice) return ''
	const value = question.criteria[option]
	return value === null || value === undefined ? '' : textOf(value)
}

/** The same Choice with one option's description set from text; a blank text means none (null). */
export function withOptionDescription(question: Question, option: string, text: string): Question {
	if (question.type !== QUESTION_KINDS.choice) return question
	return {
		...question,
		criteria: { ...question.criteria, [option]: text.trim() === '' ? null : structuredOf(text) }
	}
}

/** A question of another kind, keeping its instructions. */
export function withKind(question: Question, kind: QuestionKind): Question {
	const { instructions } = question
	if (kind === QUESTION_KINDS.choice) return { type: kind, instructions, criteria: {} }
	if (kind === QUESTION_KINDS.score) return { type: kind, instructions, criteria: [] }
	return { type: kind, instructions }
}

let nextId = 0
function freshId(): string {
	nextId += 1
	return `q${nextId}`
}

export function newQuestion(doc: SandboxDoc): SandboxQuestion {
	const taken = new Set(doc.questions.map((entry) => entry.name))
	let count = doc.questions.length + 1
	while (taken.has(`question_${count}`)) count += 1
	return {
		id: freshId(),
		name: `question_${count}`,
		question: { type: QUESTION_KINDS.noul, instructions: '' }
	}
}

type Body = { model: string; state: Structured | ''; questions: Record<string, Question> }

/** The request exactly as Jev receives it (DESIGN 3.2). Duplicate names collapse, so the build checks them first. */
export function docToBody(doc: SandboxDoc): Body {
	return {
		model: JEV_MODEL_ALIAS,
		state: doc.state,
		questions: Object.fromEntries(doc.questions.map((entry) => [entry.name, entry.question]))
	}
}

export function serializeBody(doc: SandboxDoc): string {
	return JSON.stringify(docToBody(doc), null, 2)
}

export function docFromTask(task: Task): SandboxDoc {
	const item = task.items[0]
	if (!item || !('questions' in task.jev)) throw new Error(`${task.id} is not a Sandbox task`)
	return {
		state: item.state,
		questions: Object.entries(task.jev.questions).map(([name, question]) => ({
			id: freshId(),
			name,
			question
		}))
	}
}

const bodySchema = z.object({
	state: structuredSchema,
	questions: z.record(z.string().min(1), questionSchema)
})

export type DocParse = { ok: true; doc: SandboxDoc } | { ok: false; error: string }

/** The JSON view's text as a setup, or what is wrong with it in plain words. */
export function bodyToDoc(text: string): DocParse {
	let json: unknown
	try {
		json = JSON.parse(text)
	} catch {
		return {
			ok: false,
			error: 'This is not valid JSON yet. Check for a missing quote, comma or bracket.'
		}
	}
	const parsed = bodySchema.safeParse(json)
	if (!parsed.success) {
		const issue = parsed.error.issues[0]
		const where = issue?.path.length ? ` (at ${issue.path.join('.')})` : ''
		return {
			ok: false,
			error: `The JSON needs a "state" and a "questions" object of Noul, Choice or Score questions${where}.`
		}
	}
	return {
		ok: true,
		doc: {
			state: parsed.data.state,
			questions: Object.entries(parsed.data.questions).map(([name, question]) => ({
				id: freshId(),
				name,
				question
			}))
		}
	}
}

/** The setup as a Task, checked against the same rules as built-in content; or what to fix. */
export function buildSandboxTask(doc: SandboxDoc): TaskBuild {
	if (doc.state === '') return { ok: false, error: 'Write the state Jev should look at.' }
	if (doc.questions.length === 0) return { ok: false, error: 'Add at least one question.' }
	const names = doc.questions.map((entry) => entry.name.trim())
	if (names.some((name) => name === '')) return { ok: false, error: 'Give every question a name.' }
	if (new Set(names).size !== names.length) {
		return { ok: false, error: 'Each question needs its own name.' }
	}
	for (const entry of doc.questions) {
		if (textOf(entry.question.instructions).trim() === '') {
			return { ok: false, error: `Write the instructions for "${entry.name}".` }
		}
	}
	const parsed = taskSchema.safeParse({
		id: SANDBOX_TASK_ID,
		kind: TASK_KINDS.sandbox,
		version: 1,
		jev: { questions: docToBody(doc).questions },
		items: [{ id: SANDBOX_ITEM_ID, state: doc.state }]
	})
	if (parsed.success) return { ok: true, task: parsed.data }
	return { ok: false, error: parsed.error.issues[0]?.message ?? 'This setup is not valid.' }
}
