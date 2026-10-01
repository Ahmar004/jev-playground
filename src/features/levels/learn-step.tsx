import { Button } from '@/components/ui/button'
import { ArrowRightIcon } from '@/components/ui/icons'
import type { Level } from '@/content/level-schema'
import { RacerTag } from '@/features/race/racer-tag'

/** Learn: a short concept, shown as a side-by-side comparison of the racers (spec 6.1). */
export function LearnStep({ learn, onNext }: { learn: Level['learn']; onNext: () => void }) {
	return (
		<section aria-labelledby="learn-heading" className="flex flex-col gap-4">
			<h2 id="learn-heading" tabIndex={-1} className="text-text text-2xl font-bold">
				Learn
			</h2>
			<p className="text-text-muted text-lg">{learn.intro}</p>
			<div className="grid gap-4 md:grid-cols-2">
				{learn.compare.map((entry) => (
					<div
						key={entry.racer}
						className="bg-surface border-border flex flex-col gap-3 rounded-lg border p-4"
					>
						<RacerTag racer={entry.racer} className="text-lg" />
						<p className="text-text font-bold">{entry.title}</p>
						<ul className="text-text-muted flex list-disc flex-col gap-1 pl-5">
							{entry.points.map((point) => (
								<li key={point}>{point}</li>
							))}
						</ul>
					</div>
				))}
			</div>
			<div>
				<Button type="button" onClick={onNext}>
					Make your prediction
					<ArrowRightIcon />
				</Button>
			</div>
		</section>
	)
}
