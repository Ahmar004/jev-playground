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
