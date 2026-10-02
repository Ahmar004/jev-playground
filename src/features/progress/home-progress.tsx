import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { BADGE_LABELS } from '@/lib/constants'
import { ROUTES } from '@/lib/links'
import type { ProgressSummary } from '@/server/data/progress'
import type { PathLevel } from './path-view'
import { ProgressBar } from './progress-bar'

/** Home's progress card: levels done, XP, badges and the way to the Path. */
export function HomeProgress({
	summary,
	firstLevel
}: {
	summary: ProgressSummary
	firstLevel: PathLevel
}) {
	const { doneCount, levelCount, xp, badges } = summary
	return (
		<Card className="flex max-w-2xl flex-col gap-3 p-4">
			<h2 className="text-text text-lg font-semibold">Your progress</h2>
			<p className="text-text">
				{doneCount} of {levelCount} levels done
			</p>
			<div>
				<ProgressBar done={doneCount} total={levelCount} />
			</div>
			<p className="text-text font-medium">{xp} XP</p>
			{badges.length > 0 ? (
				<ul className="flex flex-wrap gap-2" aria-label="Badges earned">
					{badges.map((badge) => (
						<li key={badge} className="bg-surface-hover text-text rounded-full px-3 py-1 text-sm">
							{BADGE_LABELS[badge].name}
						</li>
					))}
				</ul>
			) : (
				<p className="text-text-muted text-sm">
					No badges yet. Finish level {firstLevel.order} to earn your first.
				</p>
			)}
			<div>
				<Button asChild variant="secondary">
					<Link href={ROUTES.path}>See your path</Link>
				</Button>
			</div>
		</Card>
	)
}
