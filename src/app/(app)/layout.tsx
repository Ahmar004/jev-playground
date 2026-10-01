import Link from 'next/link'
import { SiteHeader } from '@/features/shell/site-header'
import { ROUTES } from '@/lib/links'

export default function AppLayout({ children }: { children: React.ReactNode }) {
	return (
		<div className="flex min-h-screen flex-col">
			<SiteHeader />
			<div className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">{children}</div>
			<footer className="border-border text-text-muted border-t py-6 text-sm">
				<nav aria-label="Footer" className="mx-auto flex max-w-6xl gap-4 px-4">
					<Link
						href={ROUTES.glossary}
						className="hover:text-text focus-visible:outline-accent rounded underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2"
					>
						Glossary
					</Link>
				</nav>
			</footer>
		</div>
	)
}
