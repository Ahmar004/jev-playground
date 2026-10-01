import type { PriceTable } from '@/content/prices'
import type { Task } from '@/content/task-schema'
import { RACERS } from '@/lib/constants'
import { costUsd, priceFor } from '@/runner/cost'
import { buildJevRequest } from '@/runner/jev-request'
import { buildLlmPrompt } from '@/runner/llm-prompt'
import type { Target } from './targets'

// Dry-run only (DESIGN 4.2): a rough token count, never stored or shown in the app.
export const CHARS_PER_TOKEN = 4
// Room per LLM call for the short JSON answer plus Opus 5.5's low-effort
// thinking. Printed with the estimate, so it is never taken for a measurement.
export const LLM_OUTPUT_ALLOWANCE_TOKENS = 500
// Price-table keys for Jev versions start with this (jev-1.13.0).
const JEV_PRICE_PREFIX = 'jev-'

export type Estimate = {
	calls: number
	inputTokens: number
	outputTokens: number
	costUsd: number | null
}

function tokens(text: string): number {
	return Math.ceil(text.length / CHARS_PER_TOKEN)
}

// The request names the Jev alias; the table is keyed by version. Use the
// newest version the table knows.
function jevPriceKeys(prices: PriceTable): string[] {
	return Object.keys(prices.models)
		.filter((key) => key.startsWith(JEV_PRICE_PREFIX))
		.sort()
		.reverse()
}

export function estimateTarget(task: Task, target: Target, prices: PriceTable): Estimate {
	const isJev = target.racer === RACERS.jev
	const inputTokens = task.items.reduce(
		(sum, item) =>
			sum +
			tokens(isJev ? JSON.stringify(buildJevRequest(task, item)) : buildLlmPrompt(task, item)),
		0
	)
	const outputTokens = isJev ? 0 : task.items.length * LLM_OUTPUT_ALLOWANCE_TOKENS
	const price = priceFor(prices, isJev ? jevPriceKeys(prices) : [target.modelId])
	return {
		calls: task.items.length,
		inputTokens,
		outputTokens,
		costUsd: costUsd({ inputTokens, outputTokens }, price)
	}
}
