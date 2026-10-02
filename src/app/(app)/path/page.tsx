import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import { LEVELS } from '@/content/levels'
import { PathList } from '@/features/progress/path-list'
import { PathSkeleton } from '@/features/progress/path-skeleton'
import type { PathLevel } from '@/features/progress/path-view'
import { ROUTES } from '@/lib/links'
import { getSession } from '@/server/auth/session'
import { getProgressSummary } from '@/server/data/progress'

export const metadata: Metadata = { title: "Your path - Jev's Playground" }

const PATH_LEVELS: PathLevel[] = [...LEVELS.values()]
	.sort((a, b) => a.order - b.order)
	.map(({ id, order, title }) => ({ id, order, title }))

// Reads the signed-in user's statuses, so it sits under <Suspense>: the heading
// and intro prerender as the static shell.
async function PathLoader() {
	const session = await getSession()
	if (!session) redirect(ROUTES.signIn)
	const summary = await getProgressSummary(session.userId)
	return <PathList key={session.userId} levels={PATH_LEVELS} initialStatuses={summary.statuses} />
}

export default function PathPage() {
	return (
		<main className="flex flex-col gap-4">
			<h1 className="text-text text-3xl font-extrabold">Your path</h1>
			<p className="text-text-muted max-w-2xl text-lg">
				Play the levels in any order. Skip one and come back whenever you like.
			</p>
			<Suspense fallback={<PathSkeleton />}>
				<PathLoader />
			</Suspense>
		</main>
	)
}
