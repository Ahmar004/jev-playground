import Link from 'next/link'
import { KeysPanel } from '@/features/keys/keys-panel'
import { KeysProvider } from '@/features/keys/keys-context'
import { ModeProvider } from '@/features/mode/mode-context'
import { SiteHeader } from '@/features/shell/site-header'
import { ROUTES } from '@/lib/links'

const FOOTER_LINK =
	'hover:text-accent transition-colors focus-visible:outline-accent rounded underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2'

export default function AppLayout({ children }: { children: React.ReactNode }) {
	return (
		<ModeProvider>
			<KeysProvider>
				<div className="flex min-h-screen flex-col">
					<SiteHeader />
					<div className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:py-10">{children}</div>
					<footer className="border-border bg-surface/60 text-text-muted border-t py-6 text-sm backdrop-blur-sm">
						<nav aria-label="Footer" className="mx-auto flex max-w-6xl flex-wrap gap-4 px-4">
							<Link href={ROUTES.glossary} className={FOOTER_LINK}>
								Glossary
							</Link>
							<Link href={ROUTES.methodology} className={FOOTER_LINK}>
								Methodology
							</Link>
						</nav>
					</footer>
				</div>
				<KeysPanel />
			</KeysProvider>
		</ModeProvider>
	)
}
