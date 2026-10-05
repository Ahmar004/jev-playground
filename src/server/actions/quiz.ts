'use server'

import { refresh } from 'next/cache'
import { z } from 'zod'
import { QUIZ_TOOLS } from '@/content/quiz-schema'
import { getQuiz } from '@/content/quizzes'
import { BADGES, QUIZ_IDS, XP_AMOUNTS, XP_SOURCES } from '@/lib/constants'
import { AppError } from '@/lib/errors/app-error'
import { awardXp, syncBadges } from '@/server/awards/awards'
import { requireUser } from '@/server/auth/session'
import { db } from '@/server/db/client'
import { answersMatchQuiz, scoreQuiz } from '@/server/quiz/score'
import { validatedAction } from './validated-action'

// The badges that rest on quiz scores, so a lower retry can take them back.
const QUIZ_BADGES = [BADGES.quizClimber]

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
		const key = { userId, quizId: quiz.id }
		const result = await db.$transaction(async (tx) => {
			// The latest attempt counts (Step-42): a retry replaces the answers and the score, and
			// the quiz's XP and badges follow it. createdAt is when the counted attempt was taken.
			const previous = await tx.quizAttempt.findUnique({
				where: { userId_quizId: key },
				select: { score: true }
			})
			await tx.quizAttempt.upsert({
				where: { userId_quizId: key },
				create: { ...key, answers: input.answers, score },
				update: { answers: input.answers, score, createdAt: new Date() }
			})
			// Take back the XP of answers this attempt got wrong, then pay any newly right ones.
			const sourceIds = correctIds.map((questionId) => `${quiz.id}:${questionId}`)
			const removed = await tx.xpEvent.deleteMany({
				where: {
					userId,
					source: XP_SOURCES.quizCorrect,
					sourceId: { startsWith: `${quiz.id}:`, notIn: sourceIds }
				}
			})
			let xp = 0
			for (const sourceId of sourceIds) {
				xp += await awardXp(tx, userId, XP_SOURCES.quizCorrect, sourceId)
			}
			const badges = await syncBadges(tx, userId, QUIZ_BADGES)
			return {
				firstAttempt: previous === null,
				xpLost: removed.count * XP_AMOUNTS[XP_SOURCES.quizCorrect],
				awards: { xp, badges }
			}
		})
		refresh()
		return { ...result, score, total: quiz.questions.length }
	}
})
