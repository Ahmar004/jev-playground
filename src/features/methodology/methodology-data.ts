import type { PriceTable } from '@/content/prices'
import type { Recording } from '@/content/recording-schema'
import { RACERS, type Racer } from '@/lib/constants'

export type PriceRow = { modelId: string; inputPerM: number; outputPerM: number; source: string }
export type RecordingRow = {
	taskId: string
	racer: Racer
	modelId: string
	recordedOn: string
	items: number
}

// recordedAt is an ISO datetime; the page shows the date part.
const DATE_LENGTH = 'YYYY-MM-DD'.length

export function priceRows(table: PriceTable): PriceRow[] {
	return Object.entries(table.models)
		.map(([modelId, entry]) => ({ modelId, ...entry }))
		.sort((a, b) => a.modelId.localeCompare(b.modelId))
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
