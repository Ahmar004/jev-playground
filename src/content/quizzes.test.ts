import { describe, expect, it } from 'vitest'
import { QUIZ_IDS } from '@/lib/constants'
import { LEVELS } from './levels'
import { QUIZZES } from './quizzes'

describe('quiz content', () => {
	for (const quizId of Object.values(QUIZ_IDS)) {
		it(`${quizId} quiz has one question per level topic`, () => {
			const quiz = QUIZZES[quizId]
			expect(quiz.id).toBe(quizId)
			expect(quiz.questions.map((question) => question.topic).sort()).toEqual(
				[...LEVELS.keys()].sort()
			)
		})
	}

	it('the two quizzes share no question', () => {
		const start = new Set(QUIZZES[QUIZ_IDS.start].questions.map((question) => question.id))
		const prompts = new Set(QUIZZES[QUIZ_IDS.start].questions.map((question) => question.prompt))
		for (const question of QUIZZES[QUIZ_IDS.end].questions) {
			expect(start.has(question.id)).toBe(false)
			expect(prompts.has(question.prompt)).toBe(false)
		}
	})
})
