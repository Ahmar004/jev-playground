import { z } from 'zod'
import type { Task, TaskItem } from '@/content/task-schema'
import { ANSWER_KEY, QUESTION_KINDS, TASK_KINDS, type TaskKind } from '@/lib/constants'
import { jevQuestions } from './jev-request'
import type { LlmAnswer } from './types'

// Answer shapes from docs.typesafe.ai/api, checked 2026-10-01.
const probabilitiesSchema = z.record(z.string(), z.number())

export const jevAnswerSchema = z.discriminatedUnion('type', [
	z.object({ type: z.literal(QUESTION_KINDS.noul), noul: z.number().min(0).max(1) }),
	z.object({
		type: z.literal(QUESTION_KINDS.choice),
		choice: z.string(),
		probabilities: probabilitiesSchema,
		confidence: z.number()
	}),
	z.object({
		type: z.literal(QUESTION_KINDS.score),
		score: z.number(),
		legend: z.record(z.string(), z.string()),
		probabilities: probabilitiesSchema,
		confidence: z.number()
	})
])
export type JevAnswer = z.infer<typeof jevAnswerSchema>
export type JevAnswers = Record<string, JevAnswer>

const jevBodySchema = z.object({ answers: z.record(z.string(), jevAnswerSchema) })

export type ParseOutcome<T> = { ok: true; parsed: T } | { ok: false; parsed: null }

const FAILED = { ok: false, parsed: null } as const

function json(text: string): { ok: true; value: unknown } | { ok: false } {
	try {
		return { ok: true, value: JSON.parse(text) }
	} catch {
		return { ok: false }
	}
}

/** Jev's answers, only when every question asked has an answer of the same type. */
export function parseJevAnswers(
	task: Task,
	item: TaskItem,
	bodyText: string
): ParseOutcome<JevAnswers> {
	const body = json(bodyText)
	if (!body.ok) return FAILED
	const result = jevBodySchema.safeParse(body.value)
	if (!result.success) return FAILED
	const { answers } = result.data
	for (const [key, question] of Object.entries(jevQuestions(task, item))) {
		if (answers[key]?.type !== question.type) return FAILED
	}
	return { ok: true, parsed: answers }
}

// A whole reply wrapped in one Markdown code fence, with an optional language.
const FENCE = /^```[a-zA-Z]*\s*\n?([\s\S]*?)\s*```$/

export function stripFences(text: string): string {
	const trimmed = text.trim()
	return (FENCE.exec(trimmed)?.[1] ?? trimmed).trim()
}

function answerOf<T extends LlmAnswer>(value: unknown, schema: z.ZodType<T>): T | null {
	const result = z.object({ [ANSWER_KEY]: schema }).safeParse(value)
	return result.success ? result.data[ANSWER_KEY] : null
}

function pickAnswer(kind: TaskKind, value: unknown): LlmAnswer | null {
	switch (kind) {
		case TASK_KINDS.choice:
			return answerOf(value, z.string().min(1))
		case TASK_KINDS.noul:
			return answerOf(value, z.boolean())
		case TASK_KINDS.score:
			return answerOf(value, z.number().int().nonnegative())
		case TASK_KINDS.fanOut:
			return answerOf(value, z.record(z.string(), z.boolean()))
		case TASK_KINDS.findLines:
			return answerOf(value, z.array(z.number().int().positive()))
		case TASK_KINDS.generate:
			return answerOf(value, z.string().trim().min(1))
	}
}

/** Fences stripped, then JSON.parse, then Zod; any failure is a miss shown with its raw text (R44). */
export function parseLlmAnswer(kind: TaskKind, text: string): ParseOutcome<LlmAnswer> {
	const body = json(stripFences(text))
	if (!body.ok) return FAILED
	const answer = pickAnswer(kind, body.value)
	return answer === null ? FAILED : { ok: true, parsed: answer }
}
