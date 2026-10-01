import type { PriceEntry, PriceTable } from '@/content/prices'
import type { Usage } from './types'

const TOKENS_PER_MILLION = 1_000_000

type Price = Pick<PriceEntry, 'inputPerM' | 'outputPerM'>

/** Token counts times the stored price; null means "price unknown". Never estimated. */
export function costUsd(usage: Usage, price: Price | null): number | null {
	if (!price) return null
	return (
		(usage.inputTokens * price.inputPerM + usage.outputTokens * price.outputPerM) /
		TOKENS_PER_MILLION
	)
}

/** The price of the first model id the table knows (the answering model first, then the requested one). */
export function priceFor(table: PriceTable, modelIds: string[]): PriceEntry | null {
	for (const modelId of modelIds) {
		if (Object.hasOwn(table.models, modelId)) return table.models[modelId] ?? null
	}
	return null
}
