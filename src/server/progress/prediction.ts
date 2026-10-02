import { z } from 'zod'
import { PREDICTABLE_RACERS } from '@/content/level-schema'
import { PREDICTION_METRICS } from '@/lib/constants'
import type { Prediction } from '@/features/levels/judge'

/** The picks a user saves at Lock in; unknown metrics are rejected. */
export const predictionSchema = z.partialRecord(
	z.enum(PREDICTION_METRICS),
	z.enum(PREDICTABLE_RACERS)
)

/** Reads a stored Json column back; bad JSON counts as no picks. */
export function parseStoredPrediction(stored: unknown): Prediction {
	const parsed = predictionSchema.safeParse(stored)
	return parsed.success ? parsed.data : {}
}
