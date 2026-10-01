import { z } from 'zod'
import type { Question, RawQuestion, Structured, TaskItem } from '@/content/task-schema'
import { PROVIDER_ERROR_KINDS, RUN_EVENTS, type Racer } from '@/lib/constants'

export const usageSchema = z.object({
	inputTokens: z.number().int().nonnegative(),
	outputTokens: z.number().int().nonnegative()
})
export type Usage = z.infer<typeof usageSchema>

// One item's result for one racer (DESIGN 3.1). Recordings store these as-is.
export const itemResultSchema = z.object({
	itemId: z.string().min(1),
	// The call succeeded and the output parsed.
	ok: z.boolean(),
	// Jev's response body or the LLM's text, shown when parsing fails (R44).
	raw: z.string(),
	parsed: z.unknown(),
	// 1 or 0, or the share right for fan_out; null means "not scored".
	credit: z.number().min(0).max(1).nullable(),
	// credit === 1; null means "not scored".
	correct: z.boolean().nullable(),
	latencyMs: z.number().nonnegative(),
	usage: usageSchema,
	// null means "price unknown". Never estimated.
	costUsd: z.number().nonnegative().nullable(),
	error: z.enum(PROVIDER_ERROR_KINDS).optional()
})
export type ItemResult = z.infer<typeof itemResultSchema>

export const runTotalsSchema = z.object({
	items: z.number().int().nonnegative(),
	// Items with a stored answer.
	scored: z.number().int().nonnegative(),
	// Items with full credit.
	correct: z.number().int().nonnegative(),
	// Total credit / scored; null when nothing is scored.
	accuracy: z.number().min(0).max(1).nullable(),
	// First start to last finish.
	wallMs: z.number().nonnegative(),
	costUsd: z.number().nonnegative().nullable(),
	inputTokens: z.number().int().nonnegative(),
	outputTokens: z.number().int().nonnegative(),
	parseFailures: z.number().int().nonnegative()
})
export type RunTotals = z.infer<typeof runTotalsSchema>

export type RunEvent =
	| {
			type: typeof RUN_EVENTS.itemStarted
			racer: Racer
			itemId: string
			lane: number
			atMs: number
	  }
	| {
			type: typeof RUN_EVENTS.itemFinished
			racer: Racer
			lane: number
			atMs: number
			result: ItemResult
	  }
	| { type: typeof RUN_EVENTS.runFinished; racer: Racer; atMs: number; totals: RunTotals }

/** What every provider call returns: the text to parse, timed once, with real token counts. */
export type ProviderResult = { text: string; latencyMs: number; usage: Usage; modelId: string }

export type JevRequestBody = {
	model: string
	state: Structured
	questions: Record<string, Question | RawQuestion>
}

// An answer in the LLM's JSON format, also what Code functions return:
// choice -> option key, noul -> boolean, score -> level, fan_out -> one
// boolean per question, find_lines -> line numbers, generate -> text.
export type LlmAnswer = string | boolean | number | Record<string, boolean> | number[]

export type ItemRunner = (item: TaskItem, signal: AbortSignal) => Promise<ItemResult>
