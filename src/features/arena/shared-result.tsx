import { MODES } from '@/lib/constants'
import { SideCard } from './side-card'
import type { ArenaSnapshot } from './snapshot'
import { ScrollRegion } from '@/components/ui/scroll-region'

/**
 * A shared Arena result, read-only and plain text (R86, R87). A Developer mode
 * share says it was run by a user, so nobody mistakes it for a recording (R46).
 */
export function SharedResult({ snapshot }: { snapshot: ArenaSnapshot }) {
	const developer = snapshot.mode === MODES.developer
	return (
		<article className="flex flex-col gap-4">
			<header className="flex flex-col gap-1">
				<h1 className="text-text text-3xl font-extrabold wrap-anywhere">{snapshot.title}</h1>
				<p className="text-text-muted">
					{developer
						? 'Developer mode, run by a user: the numbers come from a live run with their own keys.'
						: 'Beginner mode: replayed from real recordings.'}
				</p>
			</header>
			<section aria-label="Input" className="flex flex-col gap-1">
				<p className="text-text-muted text-sm">Input</p>
				<ScrollRegion
					label="Input text"
					className="bg-surface-hover max-h-64 overflow-auto rounded"
				>
					<pre className="text-text p-3 text-sm wrap-anywhere whitespace-pre-wrap">
						{snapshot.state}
					</pre>
				</ScrollRegion>
				<p className="text-text-muted text-sm">
					Question:{' '}
					<span className="text-text wrap-anywhere whitespace-pre-line">{snapshot.question}</span>
				</p>
			</section>
			<div className="grid gap-4 md:grid-cols-2">
				{snapshot.sides.map((side) => (
					<SideCard key={side.racer} side={side} mode={snapshot.mode} />
				))}
			</div>
			{snapshot.expected && (
				<p className="text-text">
					Expected answer: <span className="font-bold wrap-anywhere">{snapshot.expected}</span>
				</p>
			)}
		</article>
	)
}
