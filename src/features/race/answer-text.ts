import { z } from 'zod'
import {
	ANSWER_KEY,
	ITEM_OUTCOMES,
	NOUL_THRESHOLD,
	QUESTION_KINDS,
	RACERS,
	type ItemOutcome,
	type Racer
} from '@/lib/constants'
import { jevAnswerSchema } from '@/runner/parse'
import type { ItemResult } from '@/runner/types'

const jevAnswersSchema = z.record(z.string(), jevAnswerSchema)
const combinedSchema = z.object({ answer: z.unknown() })
const PERCENT = 100

/** A label or answer as plain text (R86): an option key, yes or no, a number, or JSON for the rest. */
export function valueText(value: unknown): string {
	if (typeof value === 'string') return value
	if (typeof value === 'boolean') return value ? 'yes' : 'no'
	if (typeof value === 'number') return String(value)
	return JSON.stringify(value) ?? String(value)
}

/** What a racer answered, as plain text; null when the call failed or the output did not parse (R44). */
export function answerText(racer: Racer, result: ItemResult): string | null {
	if (!result.ok) return null
	if (racer === RACERS.jev) {
		const answers = jevAnswersSchema.safeParse(result.parsed)
		const answer = answers.success ? answers.data[ANSWER_KEY] : undefined
		if (answer?.type === QUESTION_KINDS.choice) return answer.choice
		// The same bar the scorer uses, so the word matches the Right or Wrong beside it.
		if (answer?.type === QUESTION_KINDS.noul)
			return `${valueText(answer.noul >= NOUL_THRESHOLD)} (${Math.round(answer.noul * PERCENT)}% likely yes)`
		if (answer?.type === QUESTION_KINDS.score)
			return `${valueText(answer.score)} (${Math.round(answer.confidence * PERCENT)}% sure)`
	}
	if (racer === RACERS.jevCode) {
		// Jev + Code keeps the combined answer under `answer` (a CombineOutput).
		const output = combinedSchema.safeParse(result.parsed)
		if (output.success) return valueText(output.data.answer)
	}
	return valueText(result.parsed)
}

export function itemOutcome(result: ItemResult): ItemOutcome {
	if (result.error !== undefined) return ITEM_OUTCOMES.failed
	if (!result.ok) return ITEM_OUTCOMES.unparsed
	if (result.correct === null) return ITEM_OUTCOMES.unscored
	return result.correct ? ITEM_OUTCOMES.right : ITEM_OUTCOMES.wrong
}
