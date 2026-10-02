import { describe, expect, it } from 'vitest'
import { computeTotals, mergeTotals } from './totals'
import type { ItemResult } from './types'

function result(overrides: Partial<ItemResult>): ItemResult {
	return {
		itemId: 'i',
		ok: true,
		raw: '',
		parsed: null,
		credit: 1,
		correct: true,
		latencyMs: 100,
		usage: { inputTokens: 10, outputTokens: 2 },
		costUsd: 0.5,
		...overrides
	}
}

describe('computeTotals', () => {
	it('sums tokens and cost, and averages credit over scored items', () => {
		const totals = computeTotals(
			[
				result({ itemId: 'a' }),
				result({ itemId: 'b', credit: 0.5, correct: false }),
				result({ itemId: 'c', credit: null, correct: null })
			],
			900
		)
		expect(totals).toEqual({
			items: 3,
			scored: 2,
			correct: 1,
			accuracy: 0.75,
			wallMs: 900,
			costUsd: 1.5,
			inputTokens: 30,
			outputTokens: 6,
			parseFailures: 0
		})
	})

	it('counts parse failures but not provider errors as parse failures', () => {
		const totals = computeTotals(
			[result({ ok: false, credit: 0 }), result({ ok: false, credit: 0, error: 'overloaded' })],
			1
		)
		expect(totals.parseFailures).toBe(1)
	})

	it('has no accuracy when nothing is scored, and no cost when any price is unknown', () => {
		const totals = computeTotals([result({ credit: null, correct: null, costUsd: null })], 1)
		expect(totals.accuracy).toBeNull()
		expect(totals.costUsd).toBeNull()
	})
})

describe('mergeTotals', () => {
	it('adds counts, time and cost, and weights accuracy by scored items', () => {
		const a = computeTotals(
			[result({ itemId: 'a' }), result({ itemId: 'b', credit: 0, correct: false })],
			100
		)
		const b = computeTotals([result({ itemId: 'c', costUsd: 0.25 })], 50)
		const merged = mergeTotals([a, b])
		expect(merged).toMatchObject({ items: 3, scored: 3, correct: 2, wallMs: 150, costUsd: 1.25 })
		expect(merged.accuracy).toBeCloseTo(2 / 3)
	})

	it('has no accuracy when nothing is scored and no cost when a price is unknown', () => {
		const unscored = computeTotals([result({ credit: null, correct: null, costUsd: null })], 10)
		const merged = mergeTotals([unscored, unscored])
		expect(merged.accuracy).toBeNull()
		expect(merged.costUsd).toBeNull()
	})
})
