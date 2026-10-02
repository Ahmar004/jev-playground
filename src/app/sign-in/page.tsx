import type { Metadata } from 'next'
import { HueBackdrop } from '@/components/hue-backdrop'
import { ThemeToggle } from '@/components/theme-toggle'
import { LightningIcon } from '@/components/ui/icons'
import { SignInView } from '@/features/auth/sign-in-view'

export const metadata: Metadata = { title: "Sign in - Jev's Playground" }

export default function SignInPage() {
	return (
		<main className="relative isolate flex min-h-screen flex-col items-center justify-center gap-8 overflow-hidden px-4 py-12">
			<HueBackdrop strength="strong" />
			<div className="absolute top-4 right-4">
				<ThemeToggle />
			</div>
			<div className="animate-rise flex flex-col items-center gap-3 text-center">
				<span className="from-jev to-accent text-accent-ink shadow-card-hover flex size-14 items-center justify-center rounded-lg bg-gradient-to-br">
					<LightningIcon size={28} />
				</span>
				<h1 className="text-brand text-4xl font-extrabold">Jev&apos;s Playground</h1>
				<p className="text-text-muted max-w-sm">
					Race Jev against an LLM and plain Code, and learn which tool fits which job.
				</p>
			</div>
			<div className="bg-surface border-border animate-rise shadow-card-hover w-full max-w-sm rounded-lg border p-6">
				<SignInView />
			</div>
		</main>
	)
}
