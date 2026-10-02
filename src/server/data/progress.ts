import 'server-only'
import { cache } from 'react'
import { LEVELS } from '@/content/levels'
import type { LevelProgressView } from '@/features/levels/level-progress'
import {
	LEVEL_STATUS,
	isBadgeId,
	isLevelStatus,
	type BadgeId,
	type LevelStatus
} from '@/lib/constants'
import { db } from '@/server/db/client'
import { parseStoredPrediction } from '@/server/progress/prediction'

export type ProgressSummary = {
	statuses: Record<string, LevelStatus>
	doneCount: number
	levelCount: number
	xp: number
	badges: BadgeId[]
}

/** Per-user, never cached across requests (cache() only dedupes within one): statuses of built levels, total XP and badges. */
export const getProgressSummary = cache(async (userId: string): Promise<ProgressSummary> => {
	const [rows, xpSum, badgeRows] = await Promise.all([
		db.levelProgress.findMany({ where: { userId }, select: { levelId: true, status: true } }),
		db.xpEvent.aggregate({ where: { userId }, _sum: { xp: true } }),
		db.userBadge.findMany({ where: { userId }, select: { badgeId: true } })
	])
	const statuses: Record<string, LevelStatus> = {}
	for (const row of rows) {
		if (LEVELS.has(row.levelId) && isLevelStatus(row.status)) statuses[row.levelId] = row.status
	}
	return {
		statuses,
		doneCount: Object.values(statuses).filter((status) => status === LEVEL_STATUS.done).length,
		levelCount: LEVELS.size,
		xp: xpSum._sum.xp ?? 0,
		badges: badgeRows.flatMap((row): BadgeId[] => (isBadgeId(row.badgeId) ? [row.badgeId] : []))
	}
})

export async function getLevelProgress(
	userId: string,
	levelId: string
): Promise<LevelProgressView> {
	const [row, answerRows] = await Promise.all([
		db.levelProgress.findUnique({ where: { userId_levelId: { userId, levelId } } }),
		db.checkAnswer.findMany({ where: { userId, levelId } })
	])
	const answers: LevelProgressView['answers'] = {}
	for (const answer of answerRows) {
		answers[answer.questionId] = { optionId: answer.optionId, correct: answer.correct }
	}
	return {
		status: row && isLevelStatus(row.status) ? row.status : null,
		prediction: parseStoredPrediction(row?.prediction),
		revealed: row?.revealedAt != null,
		opponentModelId: row?.opponentModelId ?? null,
		predictionCorrect: row?.predictionCorrect ?? null,
		answers
	}
}
