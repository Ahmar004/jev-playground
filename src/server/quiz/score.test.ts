import { describe, expect, it } from 'vitest'
import { QUIZ_IDS } from '@/lib/constants'
import { getQuiz } from '@/content/quizzes'
import { answersMatchQuiz, scoreQuiz } from './score'

const quiz = getQuiz(QUIZ_IDS.start)
const allRight = Object.fromEntries(quiz.questions.map((q) => [q.id, q.answer]))

describe('scoreQuiz', () => {
	it('counts the right picks', () => {
		const [first] = quiz.questions
		const answers = { ...allRight, [first!.id]: 'nope' }
		const result = scoreQuiz(quiz, answers)
		expect(result.score).toBe(quiz.questions.length - 1)
		expect(result.correctIds).not.toContain(first!.id)
	})

	it('scores a perfect quiz', () => {
		expect(scoreQuiz(quiz, allRight).score).toBe(quiz.questions.length)
	})
})

describe('answersMatchQuiz', () => {
	it('needs every question and nothing else', () => {
		expect(answersMatchQuiz(quiz, allRight)).toBe(true)
		expect(answersMatchQuiz(quiz, { ...allRight, extra: 'jev' })).toBe(false)
		const partial = { ...allRight }
		delete partial[quiz.questions[0]!.id]
		expect(answersMatchQuiz(quiz, partial)).toBe(false)
	})
})
