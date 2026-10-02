import { z } from 'zod'
import type { Recording } from '@/content/recording-schema'
import type { Task } from '@/content/task-schema'
import { ANSWER_KEY, NOUL_THRESHOLD, QUESTION_KINDS } from '@/lib/constants'
import { jevAnswerSchema } from './parse'

// A pick's confidence runs from a coin flip to certain (level 4).
export const MIN_CONFIDENCE = 0.5
export const MAX_CONFIDENCE = 1
// Each bucket covers 10 points of confidence: 50-60, 60-70, ... 90-100.
const BUCKET_WIDTH = 0.1
const BUCKET_COUNT = 5

export type CalibrationPoint = { confidence: number; correct: boolean }
export type CalibrationBucket = {
	from: number
	to: number
	count: number
	// The share of picks in the bucket that were right; null when it is empty.
	accuracy: number | null
}

/** One true/false pick: how sure the racer was in its own pick, and whether the pick was right. */
export function pickPoint(says: boolean, confidence: number, label: boolean): CalibrationPoint {
	return { confidence, correct: says === label }
}

/** Jev's Noul on a statement is the probability it is true, so its confidence is the likelier side's. */
export function noulPoint(noul: number, label: boolean): CalibrationPoint {
	const says = noul >= NOUL_THRESHOLD
	return pickPoint(says, says ? noul : 1 - noul, label)
}

const jevAnswersSchema = z.record(z.string(), jevAnswerSchema)

/** Jev's recorded Nouls as calibration points; calls that failed or did not parse are left out. */
export function jevCalibrationPoints(task: Task, jev: Recording): CalibrationPoint[] {
	const labels = new Map(task.items.map((item) => [item.id, item.label]))
	return jev.events.flatMap((event) => {
		const label = labels.get(event.itemId)
		const answers = jevAnswersSchema.safeParse(event.parsed)
		const answer = answers.success ? answers.data[ANSWER_KEY] : undefined
		if (typeof label !== 'boolean' || answer?.type !== QUESTION_KINDS.noul) return []
		return [noulPoint(answer.noul, label)]
	})
}

/** Groups points into 10-point confidence buckets and reports how often each bucket was right. */
export function calibrationBuckets(points: CalibrationPoint[]): CalibrationBucket[] {
	return Array.from({ length: BUCKET_COUNT }, (_, index) => {
		const from = MIN_CONFIDENCE + index * BUCKET_WIDTH
		const to = from + BUCKET_WIDTH
		const last = index === BUCKET_COUNT - 1
		const inside = points.filter(
			(point) => point.confidence >= from && (last ? point.confidence <= to : point.confidence < to)
		)
		return {
			from,
			to,
			count: inside.length,
			accuracy:
				inside.length === 0 ? null : inside.filter((point) => point.correct).length / inside.length
		}
	})
}
