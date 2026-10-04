import { z } from 'zod'
import { PROVIDERS } from '@/lib/constants'
import raw from '../../content/prices.json'

// Dollars per million tokens, with the page the price was read from (DESIGN 4.1).
// validUntil is the last day (UTC) of a promotional price; after it the price is unknown.
export const priceEntrySchema = z.object({
	inputPerM: z.number().nonnegative(),
	outputPerM: z.number().nonnegative(),
	source: z.url(),
	validUntil: z.iso.date().optional()
})
export type PriceEntry = z.infer<typeof priceEntrySchema>

// The table also names each model's provider, so Methodology can group the prices.
export const priceTableEntrySchema = priceEntrySchema.extend({
	provider: z.enum(Object.values(PROVIDERS))
})

export const priceTableSchema = z.object({
	checkedOn: z.iso.date(),
	models: z.record(z.string().min(1), priceTableEntrySchema)
})
export type PriceTable = z.infer<typeof priceTableSchema>

// Parsed at import, so a malformed file fails the build at prerender.
export const PRICES: PriceTable = priceTableSchema.parse(raw)
