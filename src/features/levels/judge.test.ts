import { describe, expect, it } from 'vitest'
import type { RunTotals } from '@/runner/types'
import { levelSchema } from '@/content/level-schema'
import { testLevel } from '@/content/testing/levels'
import { PREDICTION_METRICS, PREDICTION_OUTCOMES, type PredictionOutcome } from '@/lib/constants'
import { jevRecording, opusRecording, sonnetRecording } from '@/features/race/testing/recordings'
import {
	isPredictionCorrect,
	judgeAll,
	judgedTotals,
	judgePrediction,
	type Contender
} from './judge'

function totals(overrides: Partial<RunTotals>): RunTotals {
	return {
		items: 40,
		scored: 40,
		correct: 36,
		accuracy: 0.9,
		wallMs: 1000,
		costUsd: 0.01,
		inputTokens: 1,
		outputTokens: 1,
		parseFailures: 0,
		...overrides
	}
}

const jevWins: Contender[] = [
	{ racer: 'jev', totals: totals({ wallMs: 2000, costUsd: 0.0001, accuracy: 0.85 }) },
	{ racer: 'llm', totals: totals({ wallMs: 40_000, costUsd: 0.4, accuracy: 0.95 }) }
]

describe('judgePrediction', () => {
	it('marks the fastest, cheapest and most accurate racer', () => {
		expect(judgePrediction('fastest', 'jev', jevWins)).toEqual({
			metric: 'fastest',
			predicted: 'jev',
			winners: ['jev'],
			outcome: 'right'
		})
		expect(judgePrediction('cheapest', 'llm', jevWins).outcome).toBe('wrong')
		expect(judgePrediction('most_accurate', 'llm', jevWins).outcome).toBe('right')
	})

	it('calls equal numbers a tie', () => {
		const even: Contender[] = [
			{ racer: 'jev', totals: totals({ accuracy: 0.9 }) },
			{ racer: 'llm', totals: totals({ accuracy: 0.9 }) }
		]
		expect(judgePrediction('most_accurate', 'jev', even)).toMatchObject({
			winners: ['jev', 'llm'],
			outcome: 'tie'
		})
	})

	it('cannot judge a missing number, such as an unknown price', () => {
		const unknownPrice: Contender[] = [
			jevWins[0],
			{ racer: 'llm', totals: totals({ costUsd: null }) }
		].filter((contender): contender is Contender => contender !== undefined)
		expect(judgePrediction('cheapest', 'jev', unknownPrice)).toMatchObject({
			winners: null,
			outcome: 'unknown'
		})
	})

	it('still shows the winner when no prediction was made', () => {
		expect(judgePrediction('fastest', undefined, jevWins)).toMatchObject({
			predicted: null,
			winners: ['jev'],
			outcome: 'skipped'
		})
	})
})

describe('isPredictionCorrect', () => {
	const O = PREDICTION_OUTCOMES
	const v = (outcome: PredictionOutcome) => ({
		metric: PREDICTION_METRICS.fastest,
		predicted: null,
		winners: null,
		outcome
	})

	it('needs every clear pick right and at least one right', () => {
		expect(isPredictionCorrect([v(O.right), v(O.right), v(O.tie)])).toBe(true)
		expect(isPredictionCorrect([v(O.right), v(O.wrong)])).toBe(false)
		expect(isPredictionCorrect([v(O.tie), v(O.unknown)])).toBe(false)
		expect(isPredictionCorrect([v(O.skipped), v(O.skipped)])).toBe(false)
		expect(isPredictionCorrect([v(O.right), v(O.skipped)])).toBe(true)
		expect(isPredictionCorrect([])).toBe(false)
	})
})

describe('judgeAll', () => {
	it('returns one verdict per predict question in order', () => {
		const level = levelSchema.parse(testLevel)
		const jev = totals({ wallMs: 100, costUsd: 0.5, accuracy: 0.5 })
		const opponent = totals({ wallMs: 200, costUsd: 0.1, accuracy: 0.9 })
		const verdicts = judgeAll(
			level,
			{ [PREDICTION_METRICS.fastest]: 'jev', [PREDICTION_METRICS.cheapest]: 'jev' },
			jev,
			opponent
		)
		expect(verdicts.map((verdict) => verdict.metric)).toEqual(
			level.predict.questions.map((question) => question.metric)
		)
		expect(verdicts.map((verdict) => verdict.outcome)).toEqual([
			PREDICTION_OUTCOMES.right,
			PREDICTION_OUTCOMES.wrong,
			PREDICTION_OUTCOMES.skipped
		])
	})
})

describe('delivers', () => {
	it('is won by the racer with more items answered right, even when the other has no accuracy', () => {
		const verdict = judgePrediction('delivers', 'llm', [
			{ racer: 'jev', totals: totals({ scored: 0, correct: 0, accuracy: null }) },
			{ racer: 'llm', totals: totals({ scored: 3, correct: 3, accuracy: 1 }) }
		])
		expect(verdict.outcome).toBe(PREDICTION_OUTCOMES.right)
	})
})

describe('judgedTotals', () => {
	const level = levelSchema.parse({
		...testLevel,
		tasks: [
			{ id: jevRecording.taskId, title: 'Race' },
			{ id: 'after-fix', title: 'After the fix', judged: false }
		]
	})

	it('reads only the judged tasks, for Jev and the named opponent', () => {
		const result = judgedTotals(
			level,
			[jevRecording, opusRecording, sonnetRecording],
			opusRecording.modelId
		)
		expect(result?.jev).toEqual(jevRecording.totals)
		expect(result?.opponent).toEqual(opusRecording.totals)
	})

	it('is null when the opponent has no recording for a judged task', () => {
		expect(judgedTotals(level, [jevRecording], opusRecording.modelId)).toBeNull()
	})
})
