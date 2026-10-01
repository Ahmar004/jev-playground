import { describe, expect, it } from 'vitest'
import type { RunTotals } from '@/runner/types'
import { judgePrediction, type Contender } from './judge'

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
