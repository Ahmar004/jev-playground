import type { ItemResult, RunTotals } from './types'

export function computeTotals(results: ItemResult[], wallMs: number): RunTotals {
	const scored = results.filter((result) => result.credit !== null)
	const totalCredit = scored.reduce((sum, result) => sum + (result.credit ?? 0), 0)
	const anyUnknownPrice = results.some((result) => result.costUsd === null)
	return {
		items: results.length,
		scored: scored.length,
		correct: results.filter((result) => result.correct === true).length,
		accuracy: scored.length === 0 ? null : totalCredit / scored.length,
		wallMs,
		costUsd: anyUnknownPrice
			? null
			: results.reduce((sum, result) => sum + (result.costUsd ?? 0), 0),
		inputTokens: results.reduce((sum, result) => sum + result.usage.inputTokens, 0),
		outputTokens: results.reduce((sum, result) => sum + result.usage.outputTokens, 0),
		parseFailures: results.filter((result) => !result.ok && result.error === undefined).length
	}
}

/**
 * One racer's totals over several tasks run one after another: counts and
 * cost add up, and accuracy is the credit share over every scored item.
 */
export function mergeTotals(parts: RunTotals[]): RunTotals {
	const scored = parts.reduce((sum, part) => sum + part.scored, 0)
	const totalCredit = parts.reduce((sum, part) => sum + (part.accuracy ?? 0) * part.scored, 0)
	return {
		items: parts.reduce((sum, part) => sum + part.items, 0),
		scored,
		correct: parts.reduce((sum, part) => sum + part.correct, 0),
		accuracy: scored === 0 ? null : totalCredit / scored,
		wallMs: parts.reduce((sum, part) => sum + part.wallMs, 0),
		costUsd: parts.some((part) => part.costUsd === null)
			? null
			: parts.reduce((sum, part) => sum + (part.costUsd ?? 0), 0),
		inputTokens: parts.reduce((sum, part) => sum + part.inputTokens, 0),
		outputTokens: parts.reduce((sum, part) => sum + part.outputTokens, 0),
		parseFailures: parts.reduce((sum, part) => sum + part.parseFailures, 0)
	}
}
