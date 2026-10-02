import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import {
	ArenaIcon,
	BookIcon,
	GamesIcon,
	PlayIcon,
	QuizIcon,
	SandboxIcon,
	SparkleIcon,
	TrophyIcon,
	UserIcon
} from '@/components/ui/icons'
import { LEVELS } from '@/content/levels'
import { HomeProgress } from '@/features/progress/home-progress'
import type { PathLevel } from '@/features/progress/path-view'
import { QUIZ_IDS } from '@/lib/constants'
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

// Each tile's hue matches its page's icon in the sidebar (nav-items.tsx).
const TILES = [
	{
		href: ROUTES.games,
		label: 'Play the VS games',
		blurb: 'Jev against an LLM on the same job.',
		Icon: GamesIcon,
		hue: 'bg-llm/15 text-llm'
	},
	{
		href: ROUTES.arena,
		label: 'Try the Arena',
		blurb: 'Side-by-side results on real tasks.',
		Icon: ArenaIcon,
		hue: 'bg-danger/15 text-danger'
	},
	{
		href: ROUTES.sandbox,
		label: 'Build in the Sandbox',
		blurb: 'Write a Question and see what Jev does.',
		Icon: SandboxIcon,
		hue: 'bg-jev/15 text-jev'
	},
	{
		href: ROUTES.leaderboard,
		label: 'Your Leaderboard',
		blurb: 'Your best runs per game and model.',
		Icon: TrophyIcon,
		hue: 'bg-highlight/20 text-warning'
	},
	{
		href: ROUTES.quiz(QUIZ_IDS.start),
		label: 'Take the start quiz (optional)',
		blurb: 'See what you know before the levels.',
		Icon: QuizIcon,
		hue: 'bg-warning/15 text-warning'
	},
	{
		href: ROUTES.profile,
		label: 'Your profile',
		blurb: 'XP, badges and your shared results.',
		Icon: UserIcon,
		hue: 'bg-code/15 text-code'
	},
	{
		href: ROUTES.glossary,
		label: 'Read the Glossary',
		blurb: 'Every term in plain English.',
		Icon: BookIcon,
		hue: 'bg-accent/15 text-accent'
	}
]

export default function HomePage() {
	return (
		<main className="flex flex-col gap-6">
			<section className="border-border bg-surface shadow-card relative overflow-hidden rounded-lg border p-6 sm:p-8">
				{/* Decorative hues in the racer colors; no text sits on them alone. */}
				<div
					aria-hidden
					className="bg-hue-1/20 dark:bg-hue-1/25 pointer-events-none absolute -top-24 -right-16 size-64 rounded-full blur-3xl"
				/>
				<div
					aria-hidden
					className="bg-hue-2/20 dark:bg-hue-2/25 pointer-events-none absolute -bottom-24 left-1/3 size-64 rounded-full blur-3xl"
				/>
				<div className="relative flex max-w-2xl flex-col gap-4">
					<span className="bg-accent/12 text-accent inline-flex w-fit items-center gap-1.5 rounded-full px-3 py-1 text-sm font-semibold">
						<SparkleIcon />
						Jev vs LLM vs Code
					</span>
					<h1 className="text-text text-3xl font-extrabold sm:text-4xl">
						Welcome to <span className="text-brand">Jev&apos;s Playground</span>
					</h1>
					<p className="text-text-muted text-lg">
						Jev is a System One model: it makes fast, typed judgments. Here you will race it against
						an LLM and plain Code, and learn which tool fits which job.
					</p>
					{firstLevel && (
						<div>
							<Button asChild size="lg">
								<Link href={ROUTES.level(firstLevel.id)}>
									<PlayIcon />
									Play level {firstLevel.order}: {firstLevel.title}
								</Link>
							</Button>
						</div>
					)}
				</div>
			</section>
			<ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
				{TILES.map(({ href, label, blurb, Icon, hue }) => (
					<li key={href}>
						<Card className="h-full">
							<Link
								href={href}
								className="group focus-visible:outline-accent flex h-full items-start gap-3 rounded-lg p-4 focus-visible:outline focus-visible:outline-2"
							>
								<span
									className={`flex size-10 shrink-0 items-center justify-center rounded-lg transition-transform duration-200 group-hover:scale-110 group-hover:-rotate-6 ${hue}`}
								>
									<Icon size={22} />
								</span>
								<span className="flex flex-col gap-0.5">
									<span className="text-text font-bold">{label}</span>
									<span className="text-text-muted text-sm">{blurb}</span>
								</span>
							</Link>
						</Card>
					</li>
				))}
			</ul>
			{firstLevel && (
				<Suspense fallback={<div className="skeleton h-32 rounded-lg" />}>
					<HomeProgressLoader firstLevel={firstLevel} />
				</Suspense>
			)}
		</main>
	)
}
