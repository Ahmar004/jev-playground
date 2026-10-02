'use server'

import { refresh } from 'next/cache'
import { z } from 'zod'
import { getCheckQuestion } from '@/content/levels'
import { currentRecordings } from '@/content/recordings'
import { isPredictionCorrect, judgeAll, judgedTotals } from '@/features/levels/judge'
import { LEVEL_STATUS, XP_SOURCES } from '@/lib/constants'
import { AppError } from '@/lib/errors/app-error'
import { awardXp, syncBadges, type Awards } from '@/server/awards/awards'
import { requireUser } from '@/server/auth/session'
import { db } from '@/server/db/client'
import { parseStoredPrediction, predictionSchema } from '@/server/progress/prediction'
import { completeIfReady, levelOrThrow, statusOf } from '@/server/progress/complete'
import { canSkip, nextStatusOnActivity } from '@/server/progress/rules'
import { validatedAction } from './validated-action'

const CONFLICT = 409

function alreadyRevealed(row: { predictionCorrect: boolean | null; status: string } | null) {
	const none: Awards = { xp: 0, badges: [] }
	return {
		firstReveal: false,
		predictionCorrect: row?.predictionCorrect ?? false,
		awards: none,
		levelDone: row?.status === LEVEL_STATUS.done
	}
}

export const setLevelStatus = validatedAction({
	input: z.strictObject({ levelId: z.string(), status: z.literal(LEVEL_STATUS.skipped) }),
	handler: async (input) => {
		const { userId } = await requireUser()
		levelOrThrow(input.levelId)
		const status = await db.$transaction(async (tx) => {
			const key = { userId_levelId: { userId, levelId: input.levelId } }
			const row = await tx.levelProgress.findUnique({ where: key })
			if (!canSkip(statusOf(row))) {
				throw new AppError('This level is already finished or skipped.', {
					status: CONFLICT,
					code: 'cannot_skip'
				})
			}
			await tx.levelProgress.upsert({
				where: key,
				create: { userId, levelId: input.levelId, status: input.status },
				update: { status: input.status }
			})
			return input.status
		})
		refresh()
		return { status }
	}
})

export const submitPrediction = validatedAction({
	input: z.strictObject({ levelId: z.string(), prediction: predictionSchema }),
	handler: async (input) => {
		const { userId } = await requireUser()
		const level = levelOrThrow(input.levelId)
		const asked: ReadonlySet<string> = new Set(
			level.predict.questions.map((question) => question.metric)
		)
		if (Object.keys(input.prediction).some((metric) => !asked.has(metric))) {
			throw new AppError('That level does not ask that prediction.', { code: 'unknown_metric' })
		}
		const saved = await db.$transaction(async (tx) => {
			const key = { userId_levelId: { userId, levelId: level.id } }
			const row = await tx.levelProgress.findUnique({ where: key })
			const status = nextStatusOnActivity(statusOf(row))
			if (row?.revealedAt) {
				await tx.levelProgress.update({ where: key, data: { status } })
				return false
			}
			await tx.levelProgress.upsert({
				where: key,
				create: { userId, levelId: level.id, status, prediction: input.prediction },
				update: { status, prediction: input.prediction }
			})
			return true
		})
		refresh()
		return { saved }
	}
})

export const revealPrediction = validatedAction({
	input: z.strictObject({ levelId: z.string(), opponentModelId: z.string() }),
	handler: async (input) => {
		const { userId } = await requireUser()
		const level = levelOrThrow(input.levelId)
		const recordings = level.tasks.flatMap((task) => currentRecordings(task.id))
		const totals = judgedTotals(level, recordings, input.opponentModelId)
		if (!totals) {
			throw new AppError('That opponent has no recording for this level.', {
				code: 'unknown_opponent'
			})
		}
		const result = await db.$transaction(async (tx) => {
			const key = { userId_levelId: { userId, levelId: level.id } }
			const row = await tx.levelProgress.findUnique({ where: key })
			if (row?.revealedAt) return alreadyRevealed(row)
			const stored = parseStoredPrediction(row?.prediction)
			const correct = isPredictionCorrect(judgeAll(level, stored, totals.jev, totals.opponent))
			// Guarded claim: only the call that flips revealedAt from null wins, so a
			// concurrent Reveal can never overwrite the first result or double-award.
			await tx.levelProgress.createMany({
				data: [{ userId, levelId: level.id, status: nextStatusOnActivity(statusOf(row)) }],
				skipDuplicates: true
			})
			const claim = await tx.levelProgress.updateMany({
				where: { userId, levelId: level.id, revealedAt: null },
				data: {
					status: nextStatusOnActivity(statusOf(row)),
					revealedAt: new Date(),
					opponentModelId: input.opponentModelId,
					predictionCorrect: correct
				}
			})
			if (claim.count === 0) {
				const winner = await tx.levelProgress.findUnique({ where: key })
				return alreadyRevealed(winner)
			}
			const predictionXp = correct
				? await awardXp(tx, userId, XP_SOURCES.predictionCorrect, level.id)
				: 0
			const completion = await completeIfReady(tx, userId, level)
			const badges = await syncBadges(tx, userId)
			return {
				firstReveal: true,
				predictionCorrect: correct,
				awards: { xp: predictionXp + completion.xp, badges },
				levelDone: completion.levelDone
			}
		})
		refresh()
		return result
	}
})

export const submitCheck = validatedAction({
	input: z.strictObject({ levelId: z.string(), questionId: z.string(), optionId: z.string() }),
	handler: async (input) => {
		const { userId } = await requireUser()
		const level = levelOrThrow(input.levelId)
		const found = getCheckQuestion(input.questionId)
		if (!found || found.level.id !== level.id) {
			throw new AppError('That question does not belong to this level.', {
				code: 'unknown_question'
			})
		}
		const { question } = found
		if (!question.options.some((option) => option.id === input.optionId)) {
			throw new AppError('That answer is not one of the options.', { code: 'unknown_option' })
		}
		const correct = input.optionId === question.answerId
		const result = await db.$transaction(async (tx) => {
			const inserted = await tx.checkAnswer.createMany({
				data: [
					{
						userId,
						questionId: question.id,
						levelId: level.id,
						optionId: input.optionId,
						correct
					}
				],
				skipDuplicates: true
			})
			const firstAnswer = inserted.count === 1
			const answerXp =
				firstAnswer && correct ? await awardXp(tx, userId, XP_SOURCES.checkCorrect, question.id) : 0
			const storedRow = await tx.checkAnswer.findUnique({
				where: { userId_questionId: { userId, questionId: question.id } }
			})
			const stored = storedRow
				? { optionId: storedRow.optionId, correct: storedRow.correct }
				: { optionId: input.optionId, correct }
			const key = { userId_levelId: { userId, levelId: level.id } }
			const row = await tx.levelProgress.findUnique({ where: key })
			const status = nextStatusOnActivity(statusOf(row))
			await tx.levelProgress.upsert({
				where: key,
				create: { userId, levelId: level.id, status },
				update: { status }
			})
			const completion = await completeIfReady(tx, userId, level)
			const badges = await syncBadges(tx, userId)
			return {
				firstAnswer,
				correct,
				stored,
				awards: { xp: answerXp + completion.xp, badges },
				levelDone: completion.levelDone
			}
		})
		refresh()
		return result
	}
})
