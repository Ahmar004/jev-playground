import { cn } from '@/lib/cn'

export default function HomePage() {
	return (
		<main className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center gap-4 px-6">
			<h1 className="text-text text-3xl font-semibold">8x web template</h1>
			<p className={cn('text-text-muted', 'text-base')}>
				This page renders — pnpm dev to confirm the App Router and Tailwind v4 wiring work before
				you start replacing it.
			</p>
		</main>
	)
}
