import type { Metadata } from 'next'
import { ThemeToggle } from '@/components/theme-toggle'
import { LightningIcon } from '@/components/ui/icons'
import { SignInView } from '@/features/auth/sign-in-view'

export const metadata: Metadata = { title: "Sign in - Jev's Playground" }

export default function SignInPage() {
	return (
		<main className="relative flex min-h-screen flex-col items-center justify-center gap-8 px-4 py-12">
			<div className="absolute top-4 right-4">
				<ThemeToggle />
			</div>
			<div className="flex flex-col items-center gap-3 text-center">
				<span className="bg-jev text-accent-ink flex size-12 items-center justify-center rounded-lg">
					<LightningIcon size={28} />
				</span>
				<h1 className="text-text text-3xl font-extrabold">Jev&apos;s Playground</h1>
				<p className="text-text-muted max-w-sm">
					Race Jev against an LLM and plain Code, and learn which tool fits which job.
				</p>
			</div>
			<div className="bg-surface border-border w-full max-w-sm rounded-lg border p-6 shadow-sm">
				<SignInView />
			</div>
		</main>
	)
}
