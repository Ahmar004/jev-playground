import { z } from 'zod'
import {
	ANSWER_KEY,
	ITEM_OUTCOMES,
	QUESTION_KINDS,
	RACERS,
	type ItemOutcome,
	type Racer
} from '@/lib/constants'
import { jevAnswerSchema } from '@/runner/parse'
import type { ItemResult } from '@/runner/types'

const jevAnswersSchema = z.record(z.string(), jevAnswerSchema)

/** A label or answer as plain text (R86): an option key, yes or no, a number, or JSON for the rest. */
export function valueText(value: unknown): string {
	if (typeof value === 'string') return value
	if (typeof value === 'boolean') return value ? 'yes' : 'no'
	if (typeof value === 'number') return String(value)
	return JSON.stringify(value)
}

/** What a racer answered, as plain text; null when the call failed or the output did not parse (R44). */
export function answerText(racer: Racer, result: ItemResult): string | null {
	if (!result.ok) return null
	if (racer === RACERS.jev) {
		const answers = jevAnswersSchema.safeParse(result.parsed)
		const answer = answers.success ? answers.data[ANSWER_KEY] : undefined
		if (answer?.type === QUESTION_KINDS.choice) return answer.choice
	}
	return valueText(result.parsed)
}

export function itemOutcome(result: ItemResult): ItemOutcome {
	if (result.error !== undefined) return ITEM_OUTCOMES.failed
	if (!result.ok) return ITEM_OUTCOMES.unparsed
	if (result.correct === null) return ITEM_OUTCOMES.unscored
	return result.correct ? ITEM_OUTCOMES.right : ITEM_OUTCOMES.wrong
}
