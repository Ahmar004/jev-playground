'use server'

import { refresh } from 'next/cache'
import { z } from 'zod'
import { QUIZ_TOOLS } from '@/content/quiz-schema'
import { getQuiz } from '@/content/quizzes'
import { QUIZ_IDS, XP_SOURCES } from '@/lib/constants'
import { AppError } from '@/lib/errors/app-error'
import { awardXp, syncBadges, type Awards } from '@/server/awards/awards'
import { requireUser } from '@/server/auth/session'
import { db } from '@/server/db/client'
import { answersMatchQuiz, scoreQuiz } from '@/server/quiz/score'
import { validatedAction } from './validated-action'

export const submitQuiz = validatedAction({
	input: z.strictObject({
		quizId: z.enum([QUIZ_IDS.start, QUIZ_IDS.end]),
		answers: z.record(z.string(), z.enum(QUIZ_TOOLS))
	}),
	handler: async (input) => {
		const { userId } = await requireUser()
		const quiz = getQuiz(input.quizId)
		if (!answersMatchQuiz(quiz, input.answers)) {
			throw new AppError('Answer every question before you submit.', { code: 'incomplete_quiz' })
		}
		const { score, correctIds } = scoreQuiz(quiz, input.answers)
		const result = await db.$transaction(async (tx) => {
			// One scored attempt per quiz: the first submit wins, a repeat changes nothing.
			const inserted = await tx.quizAttempt.createMany({
				data: [{ userId, quizId: quiz.id, answers: input.answers, score }],
				skipDuplicates: true
			})
			if (inserted.count === 0)
				return { firstAttempt: false, awards: { xp: 0, badges: [] } as Awards }
			let xp = 0
			for (const questionId of correctIds) {
				xp += await awardXp(tx, userId, XP_SOURCES.quizCorrect, `${quiz.id}:${questionId}`)
			}
			const badges = await syncBadges(tx, userId)
			return { firstAttempt: true, awards: { xp, badges } }
		})
		refresh()
		return { ...result, score }
	}
})
