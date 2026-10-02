import 'server-only'
import { cache } from 'react'
import { isMode, type Mode } from '@/lib/constants'
import { db } from '@/server/db/client'

export type LeaderboardRow = {
	gameId: string
	modelId: string
	mode: Mode
	accuracy: number
	wallMs: number
	costUsd: number | null
	runs: number
}

/** The user's own best result per game, model and mode. Per-user, never cached across requests. */
export const getLeaderboard = cache(async (userId: string): Promise<LeaderboardRow[]> => {
	const rows = await db.leaderboardEntry.findMany({
		where: { userId },
		orderBy: [{ gameId: 'asc' }, { accuracy: 'desc' }, { wallMs: 'asc' }]
	})
	return rows.flatMap((row): LeaderboardRow[] =>
		isMode(row.mode)
			? [
					{
						gameId: row.gameId,
						modelId: row.modelId,
						mode: row.mode,
						accuracy: row.accuracy,
						wallMs: row.wallMs,
						costUsd: row.costUsd,
						runs: row.runs
					}
				]
			: []
	)
})
