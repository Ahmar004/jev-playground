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

/** Grants every badge the user now qualifies for and returns only the new ones. */
export async function syncBadges(tx: Tx, userId: string): Promise<BadgeId[]> {
	const [doneRows, correctPredictions, gameRows] = await Promise.all([
		tx.levelProgress.findMany({
			where: { userId, status: LEVEL_STATUS.done },
			select: { levelId: true }
		}),
		tx.levelProgress.count({ where: { userId, predictionCorrect: true } }),
		tx.leaderboardEntry.findMany({
			where: { userId },
			select: { gameId: true },
			distinct: ['gameId']
		})
	])
	const finishedGameIds = new Set(
		gameRows.map((row) => row.gameId).filter((gameId) => GAMES.get(gameId)?.priority === 'p0')
	)
	// A stale row for a level that no longer exists must never count.
	const doneLevelIds = new Set(
		doneRows.map((row) => row.levelId).filter((levelId) => LEVELS.has(levelId))
	)
	const added: BadgeId[] = []
	for (const badgeId of earnedBadges({ doneLevelIds, correctPredictions, finishedGameIds })) {
		const { count } = await tx.userBadge.createMany({
			data: [{ userId, badgeId }],
			skipDuplicates: true
		})
		if (count === 1) added.push(badgeId)
	}
	return added
}
