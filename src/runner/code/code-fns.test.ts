import { describe, expect, it } from 'vitest'
import { CODE_FNS } from './code-fns'
import { compareDateParts } from './dates'

describe('compareDateParts', () => {
	it('orders two calendar dates', () => {
		expect(
			compareDateParts({ year: 2025, month: 3, day: 4 }, { year: 2025, month: 4, day: 3 })
		).toBe('first')
		expect(
			compareDateParts({ year: 2026, month: 1, day: 1 }, { year: 2025, month: 12, day: 31 })
		).toBe('second')
		expect(
			compareDateParts({ year: 2025, month: 3, day: 4 }, { year: 2025, month: 3, day: 4 })
		).toBe('same')
	})

	it('throws on a date that does not exist', () => {
		expect(() =>
			compareDateParts({ year: 2025, month: 2, day: 30 }, { year: 2025, month: 3, day: 1 })
		).toThrow()
	})
})

describe('CODE_FNS.compare_dates', () => {
	it('compares two ISO dates from the state', () => {
		expect(CODE_FNS.compare_dates({ first: '2025-03-04', second: '2025-04-03' })).toBe('first')
	})

	it('throws when the state is not two ISO dates', () => {
		expect(() => CODE_FNS.compare_dates('4 March')).toThrow()
	})
})
