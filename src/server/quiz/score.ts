import type { Quiz } from '@/content/quiz-schema'

export type QuizAnswers = Record<string, string>

export type QuizScore = {
	score: number
	// Question ids answered right, in quiz order (each earns XP once).
	correctIds: string[]
}

/** Scores picks against the quiz on the server; a missing or wrong pick counts as a miss. */
export function scoreQuiz(quiz: Quiz, answers: QuizAnswers): QuizScore {
	const correctIds = quiz.questions
		.filter((question) => answers[question.id] === question.answer)
		.map((question) => question.id)
	return { score: correctIds.length, correctIds }
}

/** True when the picks name every question of the quiz, once, and nothing else. */
export function answersMatchQuiz(quiz: Quiz, answers: QuizAnswers): boolean {
	const ids = Object.keys(answers)
	return ids.length === quiz.questions.length && quiz.questions.every((q) => q.id in answers)
}
