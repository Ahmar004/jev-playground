import type { Task } from '@/content/task-schema'
import {
	MAX_CONFIDENCE,
	MIN_CONFIDENCE,
	pickPoint,
	type CalibrationPoint
} from '@/runner/calibration'

// What the user said about one statement: true or false, and how sure they are.
export type Rating = { says: boolean; confidence: number }
export type Ratings = Record<string, Rating>

export const DEFAULT_CONFIDENCE = 0.75
export const CONFIDENCE_STEP = 0.05

export function clampConfidence(value: number): number {
	return Math.min(MAX_CONFIDENCE, Math.max(MIN_CONFIDENCE, value))
}

/** The user's picks as calibration points, for statements that have a stored answer. */
export function userPoints(task: Task, ratings: Ratings): CalibrationPoint[] {
	return task.items.flatMap((item) => {
		const rating = ratings[item.id]
		return rating && typeof item.label === 'boolean'
			? [pickPoint(rating.says, rating.confidence, item.label)]
			: []
	})
}
