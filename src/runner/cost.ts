import type { PriceEntry, PriceTable } from '@/content/prices'
import type { Usage } from './types'

const TOKENS_PER_MILLION = 1_000_000
const ISO_DATE_LENGTH = 'YYYY-MM-DD'.length

type Price = Pick<PriceEntry, 'inputPerM' | 'outputPerM'>

/** Token counts times the stored price; null means "price unknown". Never estimated. */
export function costUsd(usage: Usage, price: Price | null): number | null {
	if (!price) return null
	return (
		(usage.inputTokens * price.inputPerM + usage.outputTokens * price.outputPerM) /
		TOKENS_PER_MILLION
	)
}

function isValidOn(entry: PriceEntry, on: Date): boolean {
	return !entry.validUntil || on.toISOString().slice(0, ISO_DATE_LENGTH) <= entry.validUntil
}

/**
 * The price of the first model id the table knows (the answering model first,
 * then the requested one). A promotional price past its last day counts as
 * unknown, so an old number is never shown as today's cost.
 */
export function priceFor(
	table: PriceTable,
	modelIds: string[],
	on: Date = new Date()
): PriceEntry | null {
	for (const modelId of modelIds) {
		const entry = Object.hasOwn(table.models, modelId) ? table.models[modelId] : undefined
		if (entry && isValidOn(entry, on)) return entry
	}
	return null
}
