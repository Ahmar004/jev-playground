import { z } from 'zod'
import {
	ANSWER_KEY,
	CODE_FN_IDS,
	COMBINE_FN_IDS,
	QUESTION_KINDS,
	TASK_KINDS,
	type TaskKind
} from '@/lib/constants'

// TypeSafe takes a string, an object or an array wherever it takes text
// (docs.typesafe.ai/api, checked 2026-10-01).
export const structuredSchema = z.union([
	z.string().min(1),
	z.record(z.string(), z.unknown()),
	z.array(z.unknown())
])
export type Structured = z.infer<typeof structuredSchema>

// API limits from docs.typesafe.ai/api.
const MIN_CHOICE_OPTIONS = 2
const MAX_CHOICE_OPTIONS = 255
const MIN_SCORE_LEVELS = 2
const MAX_SCORE_LEVELS = 10

const noulCriteriaSchema = z.object({ true: structuredSchema, false: structuredSchema }).partial()

export const noulQuestionSchema = z.object({
	type: z.literal(QUESTION_KINDS.noul),
	instructions: structuredSchema,
	criteria: noulCriteriaSchema.optional()
})
export type NoulQuestion = z.infer<typeof noulQuestionSchema>

export const choiceQuestionSchema = z.object({
	type: z.literal(QUESTION_KINDS.choice),
	instructions: structuredSchema,
	criteria: z.record(z.string().min(1), structuredSchema.nullable()).refine((criteria) => {
		const count = Object.keys(criteria).length
		return count >= MIN_CHOICE_OPTIONS && count <= MAX_CHOICE_OPTIONS
	}, `A Choice needs ${MIN_CHOICE_OPTIONS} to ${MAX_CHOICE_OPTIONS} options`)
})

export const scoreQuestionSchema = z.object({
	type: z.literal(QUESTION_KINDS.score),
	instructions: structuredSchema,
	criteria: z.array(structuredSchema).min(MIN_SCORE_LEVELS).max(MAX_SCORE_LEVELS)
})

export const questionSchema = z.discriminatedUnion('type', [
	noulQuestionSchema,
	choiceQuestionSchema,
	scoreQuestionSchema
])
export type Question = z.infer<typeof questionSchema>

// Level 2 sends a question type TypeSafe does not offer, so the real error is
// recorded and shown (DESIGN 7). Only generate tasks may send these.
export const rawQuestionSchema = z.looseObject({
	type: z.string().min(1),
	instructions: structuredSchema
})
export type RawQuestion = z.infer<typeof rawQuestionSchema>

const questionMapSchema = z
	.record(z.string().min(1), questionSchema)
	.refine((map) => Object.keys(map).length > 0, 'At least one question')

export const jevTemplateSchema = z.union([
	z.strictObject({ questions: questionMapSchema }),
	// find_lines: one Noul per line of the item's state (DESIGN 8, Needle Hunt).
	z.strictObject({
		perLine: z.strictObject({
			instructions: structuredSchema,
			criteria: noulCriteriaSchema.optional()
		})
	}),
	z.strictObject({ raw: z.record(z.string().min(1), rawQuestionSchema) })
])

// The LLM's question. Left out, it is derived from Jev's questions, so both
// racers get the same instructions and options (R92). A task with combine
// sets it, because Jev answers smaller questions there.
export const llmTemplateSchema = z.union([
	questionSchema,
	z.strictObject({ instructions: structuredSchema })
])
type LlmTemplate = z.infer<typeof llmTemplateSchema>

export const labelSchema = z.union([
	z.string().min(1), // choice: the option key
	z.boolean(), // noul
	z.number().int().nonnegative(), // score: the level index
	z.record(z.string(), z.boolean()), // fan_out: one boolean per question
	z.array(z.number().int().positive()) // find_lines: 1-based line numbers
])
export type Label = z.infer<typeof labelSchema>

export const taskItemSchema = z.object({
	id: z.string().min(1),
	state: structuredSchema,
	// Left out, the item is "not scored" (DESIGN 3.2).
	label: labelSchema.optional(),
	note: z.string().min(1).optional(),
	// Questions that differ per item (level 3: one Noul per list entry).
	questions: questionMapSchema.optional()
})
export type TaskItem = z.infer<typeof taskItemSchema>

const taskObjectSchema = z.object({
	id: z.string().regex(/^[a-z0-9-]+$/),
	kind: z.enum(TASK_KINDS),
	version: z.number().int().positive(),
	jev: jevTemplateSchema,
	llm: llmTemplateSchema.optional(),
	code: z.enum(CODE_FN_IDS).optional(),
	combine: z.enum(COMBINE_FN_IDS).optional(),
	items: z.array(taskItemSchema).min(1)
})
export type Task = z.infer<typeof taskObjectSchema>

const SINGLE_KINDS: ReadonlySet<TaskKind> = new Set([
	TASK_KINDS.choice,
	TASK_KINDS.noul,
	TASK_KINDS.score
])

export function isQuestion(template: LlmTemplate): template is Question {
	return 'type' in template
}

/** The lines of a find_lines state, or null when it is not an array of strings. */
export function linesOf(state: Structured): string[] | null {
	if (!Array.isArray(state)) return null
	const lines: string[] = []
	for (const line of state) {
		if (typeof line !== 'string') return null
		lines.push(line)
	}
	return lines
}

/** The question a choice, noul or score label answers: the LLM's on a combine task, Jev's otherwise. */
export function answerQuestion(task: Task): Question | null {
	if (task.llm && isQuestion(task.llm)) return task.llm
	if (!SINGLE_KINDS.has(task.kind) || !('questions' in task.jev)) return null
	return task.jev.questions[ANSWER_KEY] ?? null
}

type Problem = { message: string; path: (string | number)[] }

function isRecordLabel(label: Label): label is Record<string, boolean> {
	return typeof label === 'object' && !Array.isArray(label)
}

function sameKeys(a: Record<string, unknown>, b: Record<string, unknown>): boolean {
	const keysA = Object.keys(a).sort()
	const keysB = Object.keys(b).sort()
	return keysA.length === keysB.length && keysA.every((key, index) => key === keysB[index])
}

function itemProblems(task: Task, item: TaskItem): string[] {
	const problems: string[] = []
	const { label } = item
	if (item.questions && task.kind !== TASK_KINDS.fanOut && !task.combine) {
		problems.push('Only fan_out and combine items may set their own questions')
	}
	const question = answerQuestion(task)

	switch (task.kind) {
		case TASK_KINDS.choice: {
			if (label === undefined) break
			if (typeof label !== 'string') problems.push('A choice label is an option key')
			else if (
				question?.type === QUESTION_KINDS.choice &&
				!Object.hasOwn(question.criteria, label)
			) {
				problems.push(`Label "${label}" is not an option`)
			}
			break
		}
		case TASK_KINDS.noul: {
			if (label !== undefined && typeof label !== 'boolean') {
				problems.push('A noul label is true or false')
			}
			break
		}
		case TASK_KINDS.score: {
			if (label === undefined) break
			if (typeof label !== 'number') problems.push('A score label is a level number')
			else if (question?.type === QUESTION_KINDS.score && label >= question.criteria.length) {
				problems.push(`Label ${label} is past the last level`)
			}
			break
		}
		case TASK_KINDS.fanOut: {
			const questions = item.questions ?? ('questions' in task.jev ? task.jev.questions : {})
			if (Object.values(questions).some((q) => q.type !== QUESTION_KINDS.noul)) {
				problems.push('fan_out questions must all be Nouls')
			}
			if (label === undefined) break
			if (!isRecordLabel(label) || !sameKeys(label, questions)) {
				problems.push('A fan_out label has one boolean for every question')
			}
			break
		}
		case TASK_KINDS.findLines: {
			const lines = linesOf(item.state)
			if (!lines) {
				problems.push('A find_lines state is an array of lines')
				break
			}
			if (label === undefined) break
			if (!Array.isArray(label) || label.some((line) => line > lines.length)) {
				problems.push('find_lines labels are line numbers within the state')
			}
			break
		}
		case TASK_KINDS.generate:
		case TASK_KINDS.sandbox: {
			if (label !== undefined) problems.push(`${task.kind} items are not scored`)
			break
		}
	}
	return problems
}

/** Every rule the type system can't express. Exported for tests and the CLI. */
export function taskProblems(task: Task): Problem[] {
	const problems: Problem[] = []
	const add = (message: string, ...path: (string | number)[]) => problems.push({ message, path })

	const seen = new Set<string>()
	task.items.forEach((item, index) => {
		if (seen.has(item.id)) add(`Duplicate item id "${item.id}"`, 'items', index, 'id')
		seen.add(item.id)
		for (const message of itemProblems(task, item)) add(message, 'items', index)
	})

	const { jev, llm } = task
	const llmQuestion = llm && isQuestion(llm) ? llm : null

	if (task.kind === TASK_KINDS.sandbox) {
		if (!('questions' in jev)) add('A sandbox task needs Jev questions', 'jev')
		if (llm || task.code || task.combine) add('A sandbox task is Jev only', 'kind')
		return problems
	}
	if (task.kind === TASK_KINDS.generate) {
		if (!('raw' in jev)) add('A generate task sends raw Jev questions', 'jev')
		if (!llm || llmQuestion) add('A generate task needs llm instructions', 'llm')
		return problems
	}
	if ('raw' in jev) add('Only a generate task may send raw questions', 'jev')
	if (llm && !llmQuestion)
		add('llm instructions without a question are only for generate tasks', 'llm')
	if (llmQuestion && llmQuestion.type !== task.kind) {
		add('The llm question type must match the task kind', 'llm', 'type')
	}

	if (task.combine) {
		if (!SINGLE_KINDS.has(task.kind)) add('combine needs a choice, noul or score task', 'combine')
		if (!llmQuestion) add('A task with combine needs an llm question', 'llm')
		const direct = 'questions' in jev ? jev.questions[ANSWER_KEY] : undefined
		// Jev alone is scored on this question, so both racers must get it word for word (R92).
		if (direct && JSON.stringify(direct) !== JSON.stringify(llmQuestion)) {
			add(`Jev's "${ANSWER_KEY}" question must be the same as the llm question`, 'jev')
		}
	} else if (SINGLE_KINDS.has(task.kind)) {
		const questions = 'questions' in jev ? jev.questions : null
		const only = questions?.[ANSWER_KEY]
		if (!questions || Object.keys(questions).length !== 1 || only?.type !== task.kind) {
			add(`Jev needs exactly one ${task.kind} question named "${ANSWER_KEY}"`, 'jev')
		}
	}
	if (task.kind === TASK_KINDS.fanOut && !('questions' in jev)) {
		add('A fan_out task needs Jev questions', 'jev')
	}
	if (task.kind === TASK_KINDS.findLines && !('perLine' in jev)) {
		add('A find_lines task needs a perLine question', 'jev')
	}
	return problems
}

export const taskSchema = taskObjectSchema.superRefine((task, ctx) => {
	for (const problem of taskProblems(task)) {
		ctx.addIssue({ code: 'custom', message: problem.message, path: problem.path })
	}
})
