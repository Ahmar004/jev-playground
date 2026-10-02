import 'server-only'
import { LEVEL_STATUS, BADGES, isBadgeId, type BadgeId } from '@/lib/constants'
import { db } from '@/server/db/client'
import { jevRecord, type JevRecord } from '@/server/progress/jev-record'
import { getProgressSummary } from './progress'
import { getQuizAttempts, type QuizAttempts } from './quizzes'
import { getMyShares, type MyShare } from './shares'

export type ProfileData = {
	xp: number
	doneCount: number
	levelCount: number
	// Badge id to the ISO time it was earned.
	earned: Partial<Record<BadgeId, string>>
	quizzes: QuizAttempts
	shares: MyShare[]
	// Set once every level is done (the pathfinder badge): the completion card's facts.
	completion: { completedOn: string; jev: JevRecord } | null
}

/** Everything Profile shows, read per user and never cached. */
export async function getProfile(userId: string): Promise<ProfileData> {
	const [summary, badgeRows, quizzes, shares, doneRows] = await Promise.all([
		getProgressSummary(userId),
		db.userBadge.findMany({ where: { userId }, select: { badgeId: true, earnedAt: true } }),
		getQuizAttempts(userId),
		getMyShares(userId),
		db.levelProgress.findMany({
			where: { userId, status: LEVEL_STATUS.done },
			select: { levelId: true, opponentModelId: true }
		})
	])
	const earned: ProfileData['earned'] = {}
	for (const row of badgeRows) {
		if (isBadgeId(row.badgeId)) earned[row.badgeId] = row.earnedAt.toISOString()
	}
	const completedOn = earned[BADGES.pathfinder]
	return {
		xp: summary.xp,
		doneCount: summary.doneCount,
		levelCount: summary.levelCount,
		earned,
		quizzes,
		shares,
		completion: completedOn
			? {
					completedOn,
					jev: jevRecord(
						doneRows.flatMap((row) =>
							row.opponentModelId
								? [{ levelId: row.levelId, opponentModelId: row.opponentModelId }]
								: []
						)
					)
				}
			: null
	}
}
