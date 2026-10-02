import 'server-only'
import { LEVELS } from '@/content/levels'
import type { LevelProgressView } from '@/features/levels/level-progress'
import { LEVEL_STATUS, type BadgeId, type LevelStatus } from '@/lib/constants'
import { db } from '@/server/db/client'
import { parseStoredPrediction } from '@/server/progress/prediction'

export type ProgressSummary = {
	statuses: Record<string, LevelStatus>
	doneCount: number
	levelCount: number
	xp: number
	badges: BadgeId[]
}

/** Per-user, never cached: statuses of built levels, total XP and badges. */
export async function getProgressSummary(userId: string): Promise<ProgressSummary> {
	const [rows, xpSum, badgeRows] = await Promise.all([
		db.levelProgress.findMany({ where: { userId }, select: { levelId: true, status: true } }),
		db.xpEvent.aggregate({ where: { userId }, _sum: { xp: true } }),
		db.userBadge.findMany({ where: { userId }, select: { badgeId: true } })
	])
	const statuses: Record<string, LevelStatus> = {}
	for (const row of rows) {
		if (LEVELS.has(row.levelId)) statuses[row.levelId] = row.status as LevelStatus
	}
	return {
		statuses,
		doneCount: Object.values(statuses).filter((status) => status === LEVEL_STATUS.done).length,
		levelCount: LEVELS.size,
		xp: xpSum._sum.xp ?? 0,
		badges: badgeRows.map((row) => row.badgeId as BadgeId)
	}
}

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
		status: (row?.status as LevelStatus | undefined) ?? null,
		prediction: parseStoredPrediction(row?.prediction),
		revealed: row?.revealedAt != null,
		opponentModelId: row?.opponentModelId ?? null,
		predictionCorrect: row?.predictionCorrect ?? null,
		answers
	}
}
