import { describe, expect, it } from 'vitest'
import { COMBINE_FNS } from './combine-fns'

const noul = (value: number) => ({ type: 'noul' as const, noul: value })
const choice = (picked: string) => ({
	type: 'choice' as const,
	choice: picked,
	probabilities: {},
	confidence: 1
})

describe('COMBINE_FNS', () => {
	it('count_true counts the yes Nouls as an option key', () => {
		expect(COMBINE_FNS.count_true({ e1: noul(0.9), e2: noul(0.1), e3: noul(0.5) })).toEqual({
			answer: '2'
		})
	})

	it('compare_dates builds both dates from the six Choice answers', () => {
		const answers = {
			first_day: choice('3'),
			first_month: choice('4'),
			first_year: choice('2025'),
			second_day: choice('4'),
			second_month: choice('3'),
			second_year: choice('2025')
		}
		expect(COMBINE_FNS.compare_dates(answers)).toEqual({ answer: 'second' })
		expect(() => COMBINE_FNS.compare_dates({ first_day: choice('3') })).toThrow()
	})

	it('compare_dates throws on an empty or non-digit Choice', () => {
		const base = {
			first_day: choice('3'),
			first_month: choice('4'),
			first_year: choice('2025'),
			second_day: choice('4'),
			second_month: choice('3'),
			second_year: choice('2025')
		}
		for (const bad of ['', '  ', '3x', '-3', '1.5']) {
			expect(() => COMBINE_FNS.compare_dates({ ...base, first_day: choice(bad) })).toThrow()
			expect(() => COMBINE_FNS.compare_dates({ ...base, first_year: choice(bad) })).toThrow()
		}
	})

	it('weighted_composite throws on a bad weight', () => {
		const answers = { quality: noul(0.75), price: noul(0.25) }
		expect(() => COMBINE_FNS.weighted_composite(answers, { weights: { quality: NaN } })).toThrow()
		expect(() => COMBINE_FNS.weighted_composite(answers, { weights: { quality: -1 } })).toThrow()
		expect(() =>
			COMBINE_FNS.weighted_composite(answers, { weights: { quality: Infinity } })
		).toThrow()
		expect(() =>
			COMBINE_FNS.weighted_composite(answers, { weights: { quality: 0, price: 0 } })
		).toThrow()
	})

	it('weighted_composite averages the Nouls by weight and reports the composite', () => {
		const answers = { quality: noul(0.75), price: noul(0.25) }
		expect(COMBINE_FNS.weighted_composite(answers)).toEqual({
			answer: true,
			detail: { composite: 0.5 }
		})
		const weighted = COMBINE_FNS.weighted_composite(answers, { weights: { quality: 1, price: 3 } })
		expect(weighted.answer).toBe(false)
		expect(weighted.detail?.composite).toBeCloseTo(0.375)
	})
})
