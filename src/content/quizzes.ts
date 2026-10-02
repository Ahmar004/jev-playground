import end from '../../content/quizzes/end.json'
import start from '../../content/quizzes/start.json'
import { QUIZ_IDS, type QuizId } from '@/lib/constants'
import { quizSchema, type Quiz } from './quiz-schema'

// Every file in content/quizzes/ is imported here, so quizzes render at build time.
export const QUIZZES: Record<QuizId, Quiz> = {
	[QUIZ_IDS.start]: quizSchema.parse(start),
	[QUIZ_IDS.end]: quizSchema.parse(end)
}

export function getQuiz(quizId: QuizId): Quiz {
	return QUIZZES[quizId]
}
