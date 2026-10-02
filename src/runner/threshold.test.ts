import { describe, expect, it } from 'vitest'
import { splitByThreshold } from './threshold'

const POINTS = [
	{ confidence: 1, correct: true },
	{ confidence: 0.9, correct: true },
	{ confidence: 0.7, correct: false },
	{ confidence: 0.5, correct: true }
]

describe('splitByThreshold', () => {
	it('acts on every answer at a threshold of zero', () => {
		expect(splitByThreshold(POINTS, 0)).toEqual({ actedRight: 3, actedWrong: 1, review: 0 })
	})
	it('sends doubtful answers to a person as the threshold rises, and counts the boundary as acted', () => {
		expect(splitByThreshold(POINTS, 0.7)).toEqual({ actedRight: 2, actedWrong: 1, review: 1 })
		expect(splitByThreshold(POINTS, 0.95)).toEqual({ actedRight: 1, actedWrong: 0, review: 3 })
	})
	it('sends everything to a person above 1', () => {
		expect(splitByThreshold(POINTS, 1.01)).toEqual({ actedRight: 0, actedWrong: 0, review: 4 })
	})
})
