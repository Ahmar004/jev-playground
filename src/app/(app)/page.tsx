import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import { Button } from '@/components/ui/button'
import { LEVELS } from '@/content/levels'
import { HomeProgress } from '@/features/progress/home-progress'
import type { PathLevel } from '@/features/progress/path-view'
import { ROUTES } from '@/lib/links'
import { getSession } from '@/server/auth/session'
import { getProgressSummary } from '@/server/data/progress'

const firstLevel = [...LEVELS.values()][0]

// Per-user progress sits under <Suspense> so the welcome shell prerenders.
async function HomeProgressLoader({ firstLevel }: { firstLevel: PathLevel }) {
	const session = await getSession()
	if (!session) redirect(ROUTES.signIn)
	const summary = await getProgressSummary(session.userId)
	return <HomeProgress summary={summary} firstLevel={firstLevel} />
}

export default function HomePage() {
	return (
		<main className="flex max-w-2xl flex-col gap-4">
			<h1 className="text-text text-3xl font-extrabold">Welcome to Jev&apos;s Playground</h1>
			<p className="text-text-muted text-lg">
				Jev is a System One model: it makes fast, typed judgments. Here you will race it against an
				LLM and plain Code, and learn which tool fits which job.
			</p>
			<div className="flex flex-wrap gap-3">
				{firstLevel && (
					<Button asChild>
						<Link href={ROUTES.level(firstLevel.id)}>
							Play level {firstLevel.order}: {firstLevel.title}
						</Link>
					</Button>
				)}
				<Button asChild variant="secondary">
					<Link href={ROUTES.glossary}>Read the Glossary</Link>
				</Button>
			</div>
			{firstLevel && (
				<Suspense
					fallback={
						<div className="bg-surface-hover h-48 animate-pulse rounded-lg motion-reduce:animate-none" />
					}
				>
					<HomeProgressLoader firstLevel={firstLevel} />
				</Suspense>
			)}
		</main>
	)
}
