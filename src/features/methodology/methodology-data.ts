import type { PriceTable } from '@/content/prices'
import type { Recording } from '@/content/recording-schema'
import { PROVIDERS, RACERS, type Provider, type Racer } from '@/lib/constants'

export type PriceRow = {
	modelId: string
	inputPerM: number
	outputPerM: number
	validUntil?: string
}
export type PriceGroup = { provider: Provider; sources: string[]; rows: PriceRow[] }
export type RecordingRow = {
	taskId: string
	racer: Racer
	modelId: string
	recordedOn: string
	items: number
}

// recordedAt is an ISO datetime; the page shows the date part.
const DATE_LENGTH = 'YYYY-MM-DD'.length

// Jev first, then the LLM providers.
const PRICE_GROUP_ORDER: readonly Provider[] = [
	PROVIDERS.typesafe,
	PROVIDERS.anthropic,
	PROVIDERS.openai,
	PROVIDERS.google,
	PROVIDERS.openrouter
]

/** The stored prices, one group per provider, each with the pages its prices came from. */
export function priceGroups(table: PriceTable): PriceGroup[] {
	const entries = Object.entries(table.models).sort(([a], [b]) => a.localeCompare(b))
	return PRICE_GROUP_ORDER.flatMap((provider) => {
		const own = entries.filter(([, entry]) => entry.provider === provider)
		if (own.length === 0) return []
		return [
			{
				provider,
				sources: [...new Set(own.map(([, entry]) => entry.source))],
				rows: own.map(([modelId, { inputPerM, outputPerM, validUntil }]) => ({
					modelId,
					inputPerM,
					outputPerM,
					...(validUntil ? { validUntil } : {})
				}))
			}
		]
	})
}

export function recordingRows(recordings: Recording[]): RecordingRow[] {
	return recordings
		.map((recording) => ({
			taskId: recording.taskId,
			racer: recording.racer,
			modelId: recording.modelId,
			recordedOn: recording.recordedAt.slice(0, DATE_LENGTH),
			items: recording.totals.items
		}))
		.sort(
			(a, b) =>
				a.taskId.localeCompare(b.taskId) ||
				Number(b.racer === RACERS.jev) - Number(a.racer === RACERS.jev) ||
				a.modelId.localeCompare(b.modelId)
		)
}
