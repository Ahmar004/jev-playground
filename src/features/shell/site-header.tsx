import Link from 'next/link'
import { Suspense } from 'react'
import { ThemeToggle } from '@/components/theme-toggle'
import { LightningIcon } from '@/components/ui/icons'
import { ModeSwitch } from '@/features/mode/mode-switch'
import { ProgressBar } from '@/features/progress/progress-bar'
import { ROUTES } from '@/lib/links'
import { getSession } from '@/server/auth/session'
import { getProgressSummary } from '@/server/data/progress'
import { AccountMenu } from './account-menu'

export function SiteHeader() {
	return (
		<header className="border-border bg-surface sticky top-0 z-10 border-b">
			<div className="mx-auto flex min-h-14 max-w-6xl flex-wrap items-center justify-between gap-x-4 gap-y-1 px-4 py-1">
				<Link
					href={ROUTES.home}
					aria-label="Jev's Playground home"
					className="text-text focus-visible:outline-accent flex items-center gap-2 rounded font-extrabold focus-visible:outline focus-visible:outline-2"
				>
					<span className="bg-jev text-accent-ink flex size-8 items-center justify-center rounded">
						<LightningIcon size={18} />
					</span>
					<span className="hidden whitespace-nowrap sm:inline">Jev&apos;s Playground</span>
				</Link>
				<div className="flex flex-wrap items-center justify-end gap-1 sm:gap-3">
					<Link
						href={ROUTES.path}
						className="text-text hover:bg-surface-hover focus-visible:outline-accent hidden rounded px-2 py-1 text-sm font-medium focus-visible:outline focus-visible:outline-2 sm:inline"
					>
						Path
					</Link>
					<Link
						href={ROUTES.games}
						className="text-text hover:bg-surface-hover focus-visible:outline-accent hidden rounded px-2 py-1 text-sm font-medium focus-visible:outline focus-visible:outline-2 sm:inline"
					>
						Games
					</Link>
					<Link
						href={ROUTES.arena}
						className="text-text hover:bg-surface-hover focus-visible:outline-accent hidden rounded px-2 py-1 text-sm font-medium focus-visible:outline focus-visible:outline-2 sm:inline"
					>
						Arena
					</Link>
					<Link
						href={ROUTES.sandbox}
						className="text-text hover:bg-surface-hover focus-visible:outline-accent hidden rounded px-2 py-1 text-sm font-medium focus-visible:outline focus-visible:outline-2 sm:inline"
					>
						Sandbox
					</Link>
					<Link
						href={ROUTES.leaderboard}
						className="text-text hover:bg-surface-hover focus-visible:outline-accent hidden rounded px-2 py-1 text-sm font-medium focus-visible:outline focus-visible:outline-2 sm:inline"
					>
						Leaderboard
					</Link>
					<Suspense
						fallback={
							<div className="bg-surface-hover h-8 w-24 animate-pulse rounded motion-reduce:animate-none" />
						}
					>
						<HeaderProgress />
					</Suspense>
					<ModeSwitch />
					<ThemeToggle />
					<Suspense
						fallback={
							<div className="bg-surface-hover h-8 w-24 animate-pulse rounded motion-reduce:animate-none" />
						}
					>
						<SignedInAccount />
					</Suspense>
				</div>
			</div>
		</header>
	)
}

async function SignedInAccount() {
	const session = await getSession()
	return session ? <AccountMenu email={session.email} /> : null
}

async function HeaderProgress() {
	const session = await getSession()
	if (!session) return null
	const { doneCount, levelCount } = await getProgressSummary(session.userId)
	return <ProgressBar done={doneCount} total={levelCount} />
}
