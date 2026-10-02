import { Card } from '@/components/ui/card'
import { recordedOn } from '@/features/race/format'
import { BADGE_LABELS, BADGES } from '@/lib/constants'
import type { ProfileData } from '@/server/data/profile'

/** Shown once the path is finished (R63): the date, XP, badges, quiz scores and Jev's record across the path. */
export function CompletionCard({ profile, total }: { profile: ProfileData; total: number }) {
	const { completion, quizzes, xp, earned } = profile
	if (!completion) {
		return (
			<section aria-labelledby="completion-heading" className="flex flex-col gap-2">
				<h2 id="completion-heading" className="text-text text-xl font-bold">
					Completion card
				</h2>
				<p className="text-text-muted">
					Finish all {profile.levelCount} levels to unlock it. You have finished {profile.doneCount}{' '}
					so far.
				</p>
			</section>
		)
	}
	const badgeNames = Object.values(BADGES)
		.filter((badge) => earned[badge])
		.map((badge) => BADGE_LABELS[badge].name)
	const start = quizzes.start?.score
	const end = quizzes.end?.score
	return (
		<section aria-labelledby="completion-heading" className="flex flex-col gap-2">
			<h2 id="completion-heading" className="text-text text-xl font-bold">
				Completion card
			</h2>
			<Card className="border-accent flex flex-col gap-1 p-4">
				<p className="text-text text-lg font-bold">
					Path complete on {recordedOn(completion.completedOn)}
				</p>
				<p className="text-text">{xp} XP</p>
				<p className="text-text">
					Quizzes: start {start === undefined ? 'not taken' : `${start} of ${total}`}, end{' '}
					{end === undefined ? 'not taken' : `${end} of ${total}`}
				</p>
				<p className="text-text">
					Jev won {completion.jev.wins} and lost {completion.jev.losses} contests against the
					opponents you raced, by the recorded speed, cost and accuracy.
				</p>
				<p className="text-text-muted text-sm">Badges: {badgeNames.join(', ')}</p>
			</Card>
		</section>
	)
}
