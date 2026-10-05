'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/cn'
import { GUIDE_TARGETS } from '@/features/guide/guide'
import { HEADER_NAV, isActive } from './nav-items'

/** The header's page links, shown on wide screens; the sidebar holds them on narrow ones. */
export function HeaderNav() {
	const pathname = usePathname()
	return (
		<nav
			aria-label="Main"
			data-guide={GUIDE_TARGETS.headerNav}
			className="hidden items-center gap-0.5 xl:flex"
		>
			{HEADER_NAV.map(({ href, label }) => {
				const active = isActive(pathname, href)
				return (
					<Link
						key={href}
						href={href}
						aria-current={active ? 'page' : undefined}
						className={cn(
							'focus-visible:outline-accent relative rounded-full px-2.5 py-1.5 text-sm font-semibold whitespace-nowrap transition-colors duration-200 focus-visible:outline focus-visible:outline-2',
							active
								? 'bg-accent/12 text-accent'
								: 'text-text-muted hover:bg-surface-hover hover:text-text'
						)}
					>
						{label}
					</Link>
				)
			})}
		</nav>
	)
}
