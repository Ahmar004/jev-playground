import { COMBINE_FN_IDS, NOUL_THRESHOLD, QUESTION_KINDS, type CombineFnId } from '@/lib/constants'
import type { JevAnswers } from '@/runner/parse'
import type { LlmAnswer } from '@/runner/types'
import { compareDateParts, type DateParts } from './dates'

/** Arguments a view passes in, such as level 5's slider weights, so views never compute a score. */
export type CombineArgs = { weights?: Record<string, number> }

/** The combined answer in the LLM format, plus any numbers a view shows (level 5's composite). */
export type CombineOutput = { answer: LlmAnswer; detail?: Record<string, number> }

const DEFAULT_WEIGHT = 1
const DATE_SIDES = { first: 'first', second: 'second' } as const
type DateSide = (typeof DATE_SIDES)[keyof typeof DATE_SIDES]

function choiceNumber(answers: JevAnswers, key: string): number {
	const answer = answers[key]
	if (answer?.type !== QUESTION_KINDS.choice) throw new Error(`No Choice answer for ${key}`)
	const value = Number(answer.choice)
	if (!Number.isInteger(value)) throw new Error(`${key} is not a number: ${answer.choice}`)
	return value
}

function datePartsOf(answers: JevAnswers, side: DateSide): DateParts {
	return {
		year: choiceNumber(answers, `${side}_year`),
		month: choiceNumber(answers, `${side}_month`),
		day: choiceNumber(answers, `${side}_day`)
	}
}

function nouls(answers: JevAnswers): [string, number][] {
	return Object.entries(answers).flatMap(([key, answer]): [string, number][] =>
		answer.type === QUESTION_KINDS.noul ? [[key, answer.noul]] : []
	)
}

export const COMBINE_FNS: Record<
	CombineFnId,
	(answers: JevAnswers, args?: CombineArgs) => CombineOutput
> = {
	// Level 3: one Noul per list entry, summed into a count option key.
	[COMBINE_FN_IDS.countTrue]: (answers) => ({
		answer: String(nouls(answers).filter(([, value]) => value >= NOUL_THRESHOLD).length)
	}),
	// Level 3: day, month and year extracted by Choice for each date, compared in code.
	[COMBINE_FN_IDS.compareDates]: (answers) => ({
		answer: compareDateParts(
			datePartsOf(answers, DATE_SIDES.first),
			datePartsOf(answers, DATE_SIDES.second)
		)
	}),
	// Level 5: atomic Nouls combined with weights the user controls.
	[COMBINE_FN_IDS.weightedComposite]: (answers, args) => {
		const entries = nouls(answers)
		const weightOf = (key: string) => args?.weights?.[key] ?? DEFAULT_WEIGHT
		const totalWeight = entries.reduce((sum, [key]) => sum + weightOf(key), 0)
		if (totalWeight <= 0) throw new Error('The weights add up to nothing')
		const composite =
			entries.reduce((sum, [key, value]) => sum + weightOf(key) * value, 0) / totalWeight
		return { answer: composite >= NOUL_THRESHOLD, detail: { composite } }
	}
}
