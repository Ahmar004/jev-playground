import { describe, expect, it } from 'vitest'
import { formatAccuracy, formatCost, formatDuration, recordedOn } from './format'

describe('format', () => {
	it('shows durations under a second in ms and longer ones in seconds', () => {
		expect(formatDuration(0)).toBe('0 ms')
		expect(formatDuration(87.6)).toBe('88 ms')
		expect(formatDuration(1000)).toBe('1.0 s')
		expect(formatDuration(48_250)).toBe('48.3 s')
	})

	it('shows cost in dollars with three significant digits, or price unknown', () => {
		expect(formatCost(0)).toBe('$0')
		expect(formatCost(0.00000252)).toBe('$0.00000252')
		expect(formatCost(0.4312)).toBe('$0.431')
		expect(formatCost(null)).toBe('price unknown')
	})

	it('shows accuracy as a whole percent, or not scored', () => {
		expect(formatAccuracy(1)).toBe('100%')
		expect(formatAccuracy(0.925)).toBe('93%')
		expect(formatAccuracy(null)).toBe('not scored')
	})

	it('takes the date part of a recording time', () => {
		expect(recordedOn('2026-10-02T10:00:00.000Z')).toBe('2026-10-02')
	})
})
