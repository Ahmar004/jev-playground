import { describe, expect, it } from 'vitest'
import { levelSchema } from './level-schema'
import { testLevel } from './testing/levels'

describe('levelSchema', () => {
	it('accepts a valid level', () => {
		expect(levelSchema.parse(testLevel).id).toBe('test-level')
	})

	it('rejects a docs path that is not a path on docs.typesafe.ai', () => {
		const bad = { ...testLevel, docs: [{ path: 'https://example.com/x', title: 'X' }] }
		expect(levelSchema.safeParse(bad).success).toBe(false)
	})

	it('rejects a prediction asked twice', () => {
		const bad = {
			...testLevel,
			predict: { questions: [testLevel.predict.questions[0], testLevel.predict.questions[0]] }
		}
		expect(levelSchema.safeParse(bad).success).toBe(false)
	})

	it('rejects unknown fields', () => {
		expect(levelSchema.safeParse({ ...testLevel, extra: true }).success).toBe(false)
	})
})
