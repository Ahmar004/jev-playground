import type { Metadata } from 'next'
import { GLOSSARY } from '@/content/glossary'

export const metadata: Metadata = { title: "Glossary - Jev's Playground" }

export default function GlossaryPage() {
	return (
		<main className="mx-auto flex w-full max-w-3xl flex-col gap-6">
			<div className="flex flex-col gap-2">
				<h1 className="text-text text-3xl font-extrabold">Glossary</h1>
				<p className="text-text-muted">Every technical word on this site, in plain English.</p>
			</div>
			<dl className="flex flex-col gap-3">
				{GLOSSARY.map(({ term, definition }) => (
					<div key={term} className="bg-surface border-border shadow-card rounded-lg border p-4">
						<dt className="text-text font-bold">{term}</dt>
						<dd className="text-text-muted mt-1">{definition}</dd>
					</div>
				))}
			</dl>
		</main>
	)
}
