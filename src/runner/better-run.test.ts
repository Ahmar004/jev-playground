import { describe, expect, it } from 'vitest'
import { isBetterRun } from './better-run'

const stored = { accuracy: 0.8, wallMs: 5000 }

describe('isBetterRun', () => {
	it('replaces on higher accuracy, even when slower', () => {
		expect(isBetterRun(stored, { accuracy: 0.9, wallMs: 9000 })).toBe(true)
	})
	it('replaces on equal accuracy with a lower time', () => {
		expect(isBetterRun(stored, { accuracy: 0.8, wallMs: 4000 })).toBe(true)
	})
	it('keeps the stored result on equal accuracy and equal or higher time', () => {
		expect(isBetterRun(stored, { accuracy: 0.8, wallMs: 5000 })).toBe(false)
		expect(isBetterRun(stored, { accuracy: 0.8, wallMs: 6000 })).toBe(false)
	})
	it('keeps the stored result on lower accuracy, even when faster', () => {
		expect(isBetterRun(stored, { accuracy: 0.7, wallMs: 1000 })).toBe(false)
	})
})
