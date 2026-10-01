import { z } from 'zod'
import { RACERS } from '@/lib/constants'
import { itemResultSchema, runTotalsSchema } from '@/runner/types'
import { priceEntrySchema } from './prices'

const SHA256_HEX = /^[0-9a-f]{64}$/

// One recorded call: its result plus when and in which lane it ran.
export const recordingEventSchema = itemResultSchema.extend({
	lane: z.number().int().nonnegative(),
	startMs: z.number().nonnegative(),
	endMs: z.number().nonnegative()
})

// content/recordings/<taskId>/<slug>.json (DESIGN 4.1). Only the recording
// CLI writes these; jev_code is derived from Jev's recording, never stored.
export const recordingSchema = z.object({
	taskId: z.string().min(1),
	taskHash: z.string().regex(SHA256_HEX),
	racer: z.enum([RACERS.jev, RACERS.llm]),
	// The versioned model that answered (for Jev, e.g. jev-1.13.0).
	modelId: z.string().min(1),
	recordedAt: z.iso.datetime(),
	// The price used for every cost in this file; null means "price unknown".
	price: priceEntrySchema.nullable(),
	lanes: z.number().int().positive(),
	events: z.array(recordingEventSchema).min(1),
	totals: runTotalsSchema
})
export type Recording = z.infer<typeof recordingSchema>

// Jev's file is jev.json, so a new Jev version replaces it in place.
const JEV_SLUG = 'jev'

export function recordingSlug(recording: Pick<Recording, 'racer' | 'modelId'>): string {
	return recording.racer === RACERS.jev ? JEV_SLUG : recording.modelId
}
