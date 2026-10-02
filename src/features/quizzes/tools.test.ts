import { describe, expect, it } from 'vitest'
import { improvement } from './tools'

describe('improvement', () => {
	it('is the end score minus the start score', () => {
		expect(improvement(3, 6)).toBe(3)
		expect(improvement(6, 5)).toBe(-1)
	})
	it('is null until both quizzes are taken', () => {
		expect(improvement(null, 6)).toBeNull()
		expect(improvement(3, null)).toBeNull()
	})
})
