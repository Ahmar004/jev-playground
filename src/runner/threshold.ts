import { z } from 'zod'
import type { Recording } from '@/content/recording-schema'
import { ANSWER_KEY, QUESTION_KINDS } from '@/lib/constants'
import { jevAnswerSchema } from './parse'

export type ConfidencePoint = { confidence: number; correct: boolean }
export type ThresholdSplit = {
	// At or above the threshold: the machine acts, rightly or wrongly.
	actedRight: number
	actedWrong: number
	// Below the threshold: a person looks at it.
	review: number
}

const answersSchema = z.record(z.string(), jevAnswerSchema)

/** Jev's recorded Choice answers as confidence points; calls that failed or did not parse are left out. */
export function jevChoicePoints(jev: Recording): ConfidencePoint[] {
	return jev.events.flatMap((event) => {
		const answers = answersSchema.safeParse(event.parsed)
		const answer = answers.success ? answers.data[ANSWER_KEY] : undefined
		if (answer?.type !== QUESTION_KINDS.choice || event.correct === null) return []
		return [{ confidence: answer.confidence, correct: event.correct }]
	})
}

/** Sorts answers by a confidence threshold: act on the sure ones, send the rest to a person. */
export function splitByThreshold(points: ConfidencePoint[], threshold: number): ThresholdSplit {
	const acted = points.filter((point) => point.confidence >= threshold)
	const actedRight = acted.filter((point) => point.correct).length
	return { actedRight, actedWrong: acted.length - actedRight, review: points.length - acted.length }
}
