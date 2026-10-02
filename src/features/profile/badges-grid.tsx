import { Card } from '@/components/ui/card'
import { SuccessIcon } from '@/components/ui/icons'
import { recordedOn } from '@/features/race/format'
import { BADGE_LABELS, BADGES, type BadgeId } from '@/lib/constants'

const ALL_BADGES: BadgeId[] = Object.values(BADGES)

/** Every badge with how to earn it; earned ones show their date, the rest are marked locked in words. */
export function BadgesGrid({ earned }: { earned: Partial<Record<BadgeId, string>> }) {
	return (
		<section aria-labelledby="badges-heading" className="flex flex-col gap-3">
			<h2 id="badges-heading" className="text-text text-xl font-bold">
				Badges
			</h2>
			<ul className="grid gap-3 sm:grid-cols-2">
				{ALL_BADGES.map((badgeId) => {
					const earnedAt = earned[badgeId]
					const { name, description } = BADGE_LABELS[badgeId]
					return (
						<li key={badgeId}>
							<Card className={`flex h-full flex-col gap-1 p-3 ${earnedAt ? '' : 'opacity-70'}`}>
								<p className="text-text inline-flex items-center gap-2 font-bold">
									{earnedAt && <SuccessIcon className="text-success" />}
									{name}
								</p>
								<p className="text-text-muted text-sm">{description}</p>
								<p className="text-text-muted text-xs">
									{earnedAt ? `Earned ${recordedOn(earnedAt)}` : 'Not earned yet'}
								</p>
							</Card>
						</li>
					)
				})}
			</ul>
		</section>
	)
}
