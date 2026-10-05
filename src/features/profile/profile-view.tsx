import { Card } from '@/components/ui/card'
import { MyShares } from '@/features/arena/my-shares'
import { ImprovementNote } from '@/features/quizzes/improvement-note'
import { QUIZ_IDS } from '@/lib/constants'
import type { ProfileData } from '@/server/data/profile'
import { BadgesGrid } from './badges-grid'
import { CompletionCard } from './completion-card'
import { DeleteAccount } from './delete-account'

/** XP, badges, quiz improvement, the completion card, the user's shares and account deletion (spec 5, DESIGN 6). */
export function ProfileView({ profile, quizTotal }: { profile: ProfileData; quizTotal: number }) {
	const { quizzes } = profile
	return (
		<div className="flex max-w-3xl flex-col gap-8">
			<Card className="flex flex-col gap-1 p-4">
				<p className="text-text text-3xl font-extrabold">{profile.xp} XP</p>
				<p className="text-text-muted">
					{profile.doneCount} of {profile.levelCount} levels done
				</p>
			</Card>
			<BadgesGrid earned={profile.earned} />
			<section aria-labelledby="quiz-heading" className="flex flex-col gap-2">
				<h2 id="quiz-heading" className="text-text text-xl font-bold">
					Quiz improvement
				</h2>
				<ImprovementNote
					start={quizzes[QUIZ_IDS.start]?.score ?? null}
					end={quizzes[QUIZ_IDS.end]?.score ?? null}
					total={quizTotal}
				/>
			</section>
			<CompletionCard profile={profile} total={quizTotal} />
			<MyShares shares={profile.shares} />
			<DeleteAccount />
		</div>
	)
}
