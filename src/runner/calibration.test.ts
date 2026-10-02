import { describe, expect, it } from 'vitest'
import { calibrationBuckets, noulPoint, pickPoint } from './calibration'

describe('noulPoint', () => {
	it("takes the likelier side's probability as the confidence", () => {
		expect(noulPoint(0.9, true)).toEqual({ confidence: 0.9, correct: true })
		expect(noulPoint(0.2, true)).toEqual({ confidence: 0.8, correct: false })
		expect(noulPoint(0.2, false)).toEqual({ confidence: 0.8, correct: true })
	})
})

describe('calibrationBuckets', () => {
	it('groups picks by confidence and reports the share right in each', () => {
		const buckets = calibrationBuckets([
			pickPoint(true, 0.55, true),
			pickPoint(true, 0.55, false),
			pickPoint(true, 0.95, true),
			pickPoint(false, 1, false)
		])
		expect(buckets).toHaveLength(5)
		expect(buckets[0]).toMatchObject({ from: 0.5, count: 2, accuracy: 0.5 })
		expect(buckets[1]).toMatchObject({ count: 0, accuracy: null })
		expect(buckets[4]).toMatchObject({ count: 2, accuracy: 1 })
	})

	it('puts a confidence of exactly 0.6 in the 60-70 bucket', () => {
		const buckets = calibrationBuckets([pickPoint(true, 0.6, true)])
		expect(buckets[0]?.count).toBe(0)
		expect(buckets[1]?.count).toBe(1)
	})
})
