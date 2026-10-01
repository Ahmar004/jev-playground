import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ROUTES } from '@/lib/links'

// Slice 5 turns this into the full Home (path progress, "Play level 1").
export default function HomePage() {
	return (
		<main className="flex max-w-2xl flex-col gap-4">
			<h1 className="text-text text-3xl font-extrabold">Welcome to Jev&apos;s Playground</h1>
			<p className="text-text-muted text-lg">
				Jev is a System One model: it makes fast, typed judgments. Here you will race it against an
				LLM and plain Code, and learn which tool fits which job.
			</p>
			<div>
				<Button asChild variant="secondary">
					<Link href={ROUTES.glossary}>Read the Glossary</Link>
				</Button>
			</div>
		</main>
	)
}
