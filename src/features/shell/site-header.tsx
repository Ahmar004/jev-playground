import Link from 'next/link'
import { Suspense } from 'react'
import { ThemeToggle } from '@/components/theme-toggle'
import { ModeSwitch } from '@/features/mode/mode-switch'
import { ProgressBar } from '@/features/progress/progress-bar'
import { ROUTES } from '@/lib/links'
import { getSession } from '@/server/auth/session'
import { getProgressCounts } from '@/server/data/progress'
import { AccountMenu } from './account-menu'
import { HeaderNav } from './header-nav'
import { SideNav } from './side-nav'

/**
 * One row on every screen width: the sidebar button and title on the left,
 * the page links on wide screens, then progress, mode, theme and the profile
 * menu. Narrower screens reach every page through the sidebar.
 */
export function SiteHeader() {
	return (
		<header className="bg-surface/80 shadow-card sticky top-0 z-30 backdrop-blur-md">
			<div className="mx-auto flex h-16 max-w-7xl flex-nowrap items-center justify-between gap-2 px-3 sm:px-4">
				<div className="flex min-w-0 items-center gap-2 xl:gap-3">
					<SideNav
						progress={
							<Suspense fallback={<div className="skeleton h-8 w-32 rounded" />}>
								<HeaderProgress />
							</Suspense>
						}
					/>
					<Link
						href={ROUTES.home}
						aria-label="Jev's Playground home"
						className="text-brand focus-visible:outline-accent hidden rounded text-lg font-extrabold whitespace-nowrap focus-visible:outline focus-visible:outline-2 md:inline"
					>
						Jev&apos;s Playground
					</Link>
					<HeaderNav />
				</div>
				<div className="flex flex-nowrap items-center justify-end gap-1 sm:gap-2">
					<div className="border-border hidden sm:block xl:ml-1 xl:border-l xl:pl-3">
						<Suspense fallback={<div className="skeleton h-8 w-24 rounded" />}>
							<HeaderProgress />
						</Suspense>
					</div>
					<ModeSwitch />
					<ThemeToggle />
					<Suspense fallback={<div className="skeleton size-9 rounded-full" />}>
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
	const { doneCount, levelCount } = await getProgressCounts(session.userId)
	return <ProgressBar done={doneCount} total={levelCount} />
}
