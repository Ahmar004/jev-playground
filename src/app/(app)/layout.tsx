import Link from 'next/link'
import { SiteHeader } from '@/features/shell/site-header'
import { ROUTES } from '@/lib/links'

const FOOTER_LINK =
	'hover:text-text focus-visible:outline-accent rounded underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2'

export default function AppLayout({ children }: { children: React.ReactNode }) {
	return (
		<div className="flex min-h-screen flex-col">
			<SiteHeader />
			<div className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">{children}</div>
			<footer className="border-border text-text-muted border-t py-6 text-sm">
				<nav aria-label="Footer" className="mx-auto flex max-w-6xl gap-4 px-4">
					<Link href={ROUTES.glossary} className={FOOTER_LINK}>
						Glossary
					</Link>
					<Link href={ROUTES.methodology} className={FOOTER_LINK}>
						Methodology
					</Link>
				</nav>
			</footer>
		</div>
	)
}
