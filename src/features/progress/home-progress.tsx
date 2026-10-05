import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { GUIDE_TARGETS } from '@/features/guide/guide'
import { BADGE_LABELS } from '@/lib/constants'
import { ROUTES } from '@/lib/links'
import type { ProgressSummary } from '@/server/data/progress'
import type { PathLevel } from './path-view'

const PERCENT = 100

// Stats sit side by side with thin dividers on desktop, stacked on phones.
const STAT = 'flex flex-col justify-center gap-1 lg:border-border lg:border-l lg:pl-6'
const STAT_LABEL = 'text-text-muted text-sm font-semibold'
const STAT_VALUE = 'text-2xl font-extrabold tabular-nums'

/**
 * Home's progress card: levels done, XP, badges and the way to the Path. One
 * compact row on desktop, so the footer fits on the first screen; it stretches
 * to fill any height left above the footer.
 */
export function HomeProgress({
	summary,
	firstLevel
}: {
	summary: ProgressSummary
	firstLevel: PathLevel
}) {
	const { doneCount, levelCount, xp, badges } = summary
	const percent = levelCount > 0 ? Math.min(PERCENT, (doneCount / levelCount) * PERCENT) : 0
	return (
		<Card
			data-guide={GUIDE_TARGETS.pathProgress}
			className="flex flex-1 flex-col gap-4 p-4 sm:px-6 lg:flex-row lg:items-stretch lg:gap-6"
		>
			<div className="flex shrink-0 flex-col justify-center gap-2 lg:w-44">
				<h2 className="text-text text-xl font-bold">Your progress</h2>
				<div>
					<Button asChild variant="secondary" size="sm">
						<Link href={ROUTES.path}>See your path</Link>
					</Button>
				</div>
			</div>
			<dl className="grid flex-1 gap-4 sm:grid-cols-[1fr_1fr_1.4fr] lg:gap-6">
				<div className={STAT}>
					<dt className={STAT_LABEL}>Levels</dt>
					<dd className="flex items-center gap-3">
						<span className={`text-text ${STAT_VALUE}`}>
							{doneCount}
							<span className="text-text-muted text-base font-semibold"> / {levelCount}</span>
						</span>
						<div
							role="progressbar"
							aria-label="Levels done"
							aria-valuenow={doneCount}
							aria-valuemin={0}
							aria-valuemax={levelCount}
							className="bg-border/60 h-2 flex-1 overflow-hidden rounded-full"
						>
							{/* A percentage is data, not a design value: the one allowed inline style. */}
							<div
								className="from-accent to-jev animate-grow-x h-full origin-left rounded-full bg-gradient-to-r"
								style={{ width: `${percent}%` }}
							/>
						</div>
					</dd>
					<dd className="text-text-muted text-sm">
						{doneCount} of {levelCount} levels done
					</dd>
				</div>
				<div className={STAT}>
					<dt className={STAT_LABEL}>XP</dt>
					<dd className={`text-brand w-fit ${STAT_VALUE}`}>{xp} XP</dd>
					<dd className="text-text-muted text-sm">Earned in every part of the site.</dd>
				</div>
				<div className={STAT}>
					<dt className={STAT_LABEL}>Badges</dt>
					<dd className={`text-text ${STAT_VALUE}`}>{badges.length}</dd>
					<dd>
						{badges.length > 0 ? (
							<ul className="flex flex-wrap gap-1.5" aria-label="Badges earned">
								{badges.map((badge) => (
									<li
										key={badge}
										className="bg-highlight/20 text-text border-highlight/40 rounded-full border px-2.5 py-0.5 text-sm font-semibold"
									>
										{BADGE_LABELS[badge].name}
									</li>
								))}
							</ul>
						) : (
							<p className="text-text-muted text-sm">
								No badges yet. Finish level {firstLevel.order} to earn your first.
							</p>
						)}
					</dd>
				</div>
			</dl>
		</Card>
	)
}
