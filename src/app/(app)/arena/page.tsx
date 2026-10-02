import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import { presetViews } from '@/content/arena'
import { ArenaView } from '@/features/arena/arena-view'
import { MyShares } from '@/features/arena/my-shares'
import { ROUTES } from '@/lib/links'
import { getSession } from '@/server/auth/session'
import { getMyShares } from '@/server/data/shares'

export const metadata: Metadata = { title: "Arena - Jev's Playground" }

const SKELETON = (
	<div
		role="status"
		aria-busy="true"
		className="bg-surface-hover h-48 animate-pulse rounded-lg motion-reduce:animate-none"
	>
		<span className="sr-only">Loading</span>
	</div>
)

// Reads the signed-in user's own shares, so it sits under <Suspense>.
async function MySharesLoader() {
	const session = await getSession()
	if (!session) redirect(ROUTES.signIn)
	const shares = await getMyShares(session.userId)
	return <MyShares key={session.userId} shares={shares} />
}

export default function ArenaPage() {
	// Only each preset's own item and recorded results reach the client (R79).
	const views = presetViews()
	return (
		<main className="flex flex-col gap-6">
			<div className="flex flex-col gap-2">
				<h1 className="text-text text-3xl font-extrabold">Arena</h1>
				<p className="text-text-muted max-w-2xl text-lg">
					Pick a task and watch Jev and an LLM do it side by side. Share a result with a link anyone
					can open.
				</p>
			</div>
			{/* ArenaView reads ?preset=, which needs a Suspense boundary. */}
			<Suspense fallback={SKELETON}>
				<ArenaView views={views} />
			</Suspense>
			<Suspense fallback={SKELETON}>
				<MySharesLoader />
			</Suspense>
		</main>
	)
}
