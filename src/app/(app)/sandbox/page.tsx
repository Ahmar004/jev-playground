import type { Metadata } from 'next'
import { Suspense } from 'react'
import { templateViews } from '@/content/sandbox'
import { SandboxView } from '@/features/sandbox/sandbox-view'

export const metadata: Metadata = { title: "Sandbox - Jev's Playground" }

const SKELETON = (
	<div role="status" aria-busy="true" className="skeleton h-48 rounded-lg">
		<span className="sr-only">Loading</span>
	</div>
)

export default function SandboxPage() {
	// Only each template's own task and recorded Jev result reach the client (R79).
	const views = templateViews()
	return (
		<main className="flex flex-col gap-6">
			<div className="flex flex-col gap-2">
				<h1 className="text-text text-3xl font-extrabold">Sandbox</h1>
				<p className="text-text-muted max-w-2xl text-lg">
					Build a state and ask Jev Noul, Choice and Score questions. Start from a template and see
					its recorded answer, or write your own and run it with your TypeSafe or OpenRouter key in
					Developer mode.
				</p>
			</div>
			{/* SandboxView reads ?template=, which needs a Suspense boundary. */}
			<Suspense fallback={SKELETON}>
				<SandboxView views={views} />
			</Suspense>
		</main>
	)
}
