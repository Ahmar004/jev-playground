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
	describe('check', () => {
		const a = { id: 'a', text: 'Option A' }
		const b = { id: 'b', text: 'Option B' }
		const c = { id: 'c', text: 'Option C' }
		const question = {
			id: 'q1',
			prompt: 'Which?',
			options: [a, b, c],
			answerId: 'a',
			explanation: 'Because.'
		}
		const withQuestions = (questions: unknown[]) => ({ ...testLevel, check: { questions } })

		it('rejects a level without check', () => {
			expect(levelSchema.safeParse({ ...testLevel, check: undefined }).success).toBe(false)
		})

		it('needs one or two questions', () => {
			expect(levelSchema.safeParse(withQuestions([])).success).toBe(false)
			expect(
				levelSchema.safeParse(
					withQuestions([question, { ...question, id: 'b' }, { ...question, id: 'c' }])
				).success
			).toBe(false)
			expect(levelSchema.safeParse(withQuestions([question])).success).toBe(true)
		})

		it('needs two to four options with unique ids', () => {
			const options = (list: unknown[]) => withQuestions([{ ...question, options: list }])
			expect(levelSchema.safeParse(options([a])).success).toBe(false)
			expect(
				levelSchema.safeParse(options([a, b, c, { id: 'd', text: 'D' }, { id: 'e', text: 'E' }]))
					.success
			).toBe(false)
			expect(levelSchema.safeParse(options([a, { ...b, id: a.id }])).success).toBe(false)
		})

		it('needs answerId to name an option', () => {
			const result = levelSchema.safeParse(withQuestions([{ ...question, answerId: 'zzz' }]))
			expect(result.success).toBe(false)
			expect(JSON.stringify(result.error?.issues)).toContain('answerId must name an option')
		})

		it('needs a slug question id', () => {
			expect(levelSchema.safeParse(withQuestions([{ ...question, id: 'Bad Id' }])).success).toBe(
				false
			)
		})
	})
})
