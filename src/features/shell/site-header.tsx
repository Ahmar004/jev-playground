import Link from 'next/link'
import { Suspense } from 'react'
import { ThemeToggle } from '@/components/theme-toggle'
import { LightningIcon } from '@/components/ui/icons'
import { ROUTES } from '@/lib/links'
import { getSession } from '@/server/auth/session'
import { AccountMenu } from './account-menu'

// Header links, the progress bar, the mode switch and the Keys button arrive
// in the slices that build their pages (DESIGN 6): no link to a missing page.
export function SiteHeader() {
	return (
		<header className="border-border bg-surface sticky top-0 z-10 border-b">
			<div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4">
				<Link
					href={ROUTES.home}
					className="text-text focus-visible:outline-accent flex items-center gap-2 rounded font-extrabold focus-visible:outline focus-visible:outline-2"
				>
					<span className="bg-jev text-accent-ink flex size-8 items-center justify-center rounded">
						<LightningIcon size={18} />
					</span>
					<span className="whitespace-nowrap">Jev&apos;s Playground</span>
				</Link>
				<div className="flex shrink-0 items-center gap-1">
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
