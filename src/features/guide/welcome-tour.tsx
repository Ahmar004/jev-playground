'use client'

import { GuideIcon } from '@/components/ui/icons'
import type { GuidePart } from '@/lib/constants'
import { WELCOME_TOUR } from './guide'
import { GuideOverlay } from './guide-overlay'
import { useGuideTarget } from './use-guide-target'
import { useWelcomeTour } from './use-welcome-tour'

// Home's progress card streams in under Suspense; wait this long for it before
// showing that step's pop-up in the middle of the screen instead.
const TARGET_WAIT_MS = 3000

/** The "Take a guide tour" link under Home's welcome card, and the tour itself (ROADMAP Step-35). */
export function WelcomeTour({
	seen,
	startHref,
	startLabel
}: {
	seen: GuidePart[]
	startHref: string
	startLabel: string
}) {
	const tour = useWelcomeTour(seen, startHref)
	const step = tour.index === null ? null : (WELCOME_TOUR[tour.index] ?? null)
	const target = useGuideTarget(step?.targets.join(' ') ?? '', step !== null, TARGET_WAIT_MS)
	const first = tour.index === 0
	const skip = { label: 'Skip tour', onSelect: tour.skip }
	const back = { label: 'Back', onSelect: tour.back }

	return (
		<>
			<div className="flex justify-end">
				<button
					type="button"
					onClick={tour.start}
					className="text-text-muted hover:text-accent focus-visible:outline-accent inline-flex items-center gap-1 rounded px-1 text-xs font-semibold transition-colors focus-visible:outline focus-visible:outline-2"
				>
					<GuideIcon />
					Take a guide tour
				</button>
			</div>
			{step && target.status !== 'searching' && (
				<GuideOverlay
					target={target}
					counter={`${(tour.index ?? 0) + 1} of ${WELCOME_TOUR.length}`}
					title={step.title}
					body={step.body}
					primary={
						tour.isLast
							? { label: startLabel, onSelect: tour.playFirstLevel }
							: { label: first ? 'Show me around' : 'Next', onSelect: tour.next }
					}
					secondary={
						first
							? [skip]
							: tour.isLast
								? [{ label: 'Done', onSelect: tour.finish }, back]
								: [skip, back]
					}
					onDismiss={tour.isLast ? tour.finish : tour.skip}
				/>
			)}
		</>
	)
}
