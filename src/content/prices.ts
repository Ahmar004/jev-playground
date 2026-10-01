import { z } from 'zod'
import raw from '../../content/prices.json'

// Dollars per million tokens, with the page the price was read from (DESIGN 4.1).
export const priceEntrySchema = z.object({
	inputPerM: z.number().nonnegative(),
	outputPerM: z.number().nonnegative(),
	source: z.url()
})
export type PriceEntry = z.infer<typeof priceEntrySchema>

export const priceTableSchema = z.object({
	checkedOn: z.iso.date(),
	models: z.record(z.string().min(1), priceEntrySchema)
})
export type PriceTable = z.infer<typeof priceTableSchema>

// Parsed at import, so a malformed file fails the build at prerender.
export const PRICES: PriceTable = priceTableSchema.parse(raw)
