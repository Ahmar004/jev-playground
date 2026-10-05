import 'server-only'
import { GAMES } from '@/content/games'
import { LEVELS } from '@/content/levels'
import type { Awards } from '@/features/levels/level-progress'
import { LEVEL_STATUS, XP_AMOUNTS, type BadgeId, type XpSource } from '@/lib/constants'
import type { Prisma } from '@/server/db/client'
import { earnedBadges } from '@/server/progress/rules'

export type Tx = Prisma.TransactionClient
export type { Awards }

/** Awards XP once per (user, source, sourceId); a repeat returns 0. */
export async function awardXp(
	tx: Tx,
	userId: string,
	source: XpSource,
	sourceId: string
): Promise<number> {
	const { count } = await tx.xpEvent.createMany({
		data: [{ userId, source, sourceId, xp: XP_AMOUNTS[source] }],
		skipDuplicates: true
	})
	return count === 1 ? XP_AMOUNTS[source] : 0
}

/** Grants one badge; true when it is new. */
export async function grantBadge(tx: Tx, userId: string, badgeId: BadgeId): Promise<boolean> {
	const { count } = await tx.userBadge.createMany({
		data: [{ userId, badgeId }],
		skipDuplicates: true
	})
	return count === 1
}

/**
 * Grants every badge the user now qualifies for and returns only the new ones. A badge in
 * `revocable` that the user no longer qualifies for is taken back (a lower quiz retry).
 */
export async function syncBadges(
	tx: Tx,
	userId: string,
	revocable: readonly BadgeId[] = []
): Promise<BadgeId[]> {
	const [doneRows, correctPredictions, gameRows, quizRows] = await Promise.all([
		tx.levelProgress.findMany({
			where: { userId, status: LEVEL_STATUS.done },
			select: { levelId: true }
		}),
		tx.levelProgress.count({ where: { userId, predictionCorrect: true } }),
		tx.leaderboardEntry.findMany({
			where: { userId },
			select: { gameId: true },
			distinct: ['gameId']
		}),
		tx.quizAttempt.findMany({ where: { userId }, select: { quizId: true, score: true } })
	])
	const finishedGameIds = new Set(
		gameRows.map((row) => row.gameId).filter((gameId) => GAMES.get(gameId)?.priority === 'p0')
	)
	// A stale row for a level that no longer exists must never count.
	const doneLevelIds = new Set(
		doneRows.map((row) => row.levelId).filter((levelId) => LEVELS.has(levelId))
	)
	const quizScores = Object.fromEntries(quizRows.map((row) => [row.quizId, row.score]))
	const earned = earnedBadges({ doneLevelIds, correctPredictions, finishedGameIds, quizScores })
	const lost = revocable.filter((badgeId) => !earned.includes(badgeId))
	if (lost.length > 0) {
		await tx.userBadge.deleteMany({ where: { userId, badgeId: { in: lost } } })
	}
	const added: BadgeId[] = []
	for (const badgeId of earned) {
		const { count } = await tx.userBadge.createMany({
			data: [{ userId, badgeId }],
			skipDuplicates: true
		})
		if (count === 1) added.push(badgeId)
	}
	return added
}
