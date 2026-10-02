import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import { GAMES } from '@/content/games'
import { LEVELS } from '@/content/levels'
import { LeaderboardView } from '@/features/leaderboard/leaderboard-view'
import { SPEED_RACE_GAME_ID } from '@/lib/constants'
import { ROUTES } from '@/lib/links'
import { getSession } from '@/server/auth/session'
import { getLeaderboard } from '@/server/data/leaderboard'

export const metadata: Metadata = { title: "Your Leaderboard - Jev's Playground" }

const GAME_TITLES: Record<string, string> = {
	...Object.fromEntries([...GAMES.values()].map((game) => [game.id, game.title])),
	[SPEED_RACE_GAME_ID]: LEVELS.get(SPEED_RACE_GAME_ID)?.title ?? 'Speed Race'
}

// Reads the signed-in user's results, so it sits under <Suspense>: the heading
// and intro prerender as the static shell.
async function LeaderboardLoader() {
	const session = await getSession()
	if (!session) redirect(ROUTES.signIn)
	const rows = await getLeaderboard(session.userId)
	return <LeaderboardView key={session.userId} rows={rows} gameTitles={GAME_TITLES} />
}

export default function LeaderboardPage() {
	return (
		<main className="flex flex-col gap-4">
			<h1 className="text-text text-3xl font-extrabold">Your Leaderboard</h1>
			<p className="text-text-muted max-w-2xl text-lg">
				Your best result for each model in each timed game, with the mode it ran in. Only you see
				these.
			</p>
			<Suspense fallback={<div className="skeleton h-48 rounded-lg" />}>
				<LeaderboardLoader />
			</Suspense>
		</main>
	)
}
