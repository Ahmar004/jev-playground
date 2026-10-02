import 'server-only'
import { cache } from 'react'
import { QUIZ_IDS, isQuizId, type QuizId } from '@/lib/constants'
import { db } from '@/server/db/client'
import type { QuizAnswers } from '@/server/quiz/score'

export type QuizAttemptView = { score: number; answers: QuizAnswers; takenAt: string }
export type QuizAttempts = Record<QuizId, QuizAttemptView | null>

function toAnswers(value: unknown): QuizAnswers {
	if (typeof value !== 'object' || value === null) return {}
	return Object.fromEntries(
		Object.entries(value).flatMap(([key, pick]) => (typeof pick === 'string' ? [[key, pick]] : []))
	)
}

/** The user's scored attempt per quiz, or null when not taken. Per-user, so never cached across requests. */
export const getQuizAttempts = cache(async (userId: string): Promise<QuizAttempts> => {
	const rows = await db.quizAttempt.findMany({ where: { userId } })
	const attempts: QuizAttempts = { [QUIZ_IDS.start]: null, [QUIZ_IDS.end]: null }
	for (const row of rows) {
		if (!isQuizId(row.quizId)) continue
		attempts[row.quizId] = {
			score: row.score,
			answers: toAnswers(row.answers),
			takenAt: row.createdAt.toISOString()
		}
	}
	return attempts
})
