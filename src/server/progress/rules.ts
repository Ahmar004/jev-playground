import type { Level } from '@/content/level-schema'
import {
	BADGES,
	FIRST_LEVEL_ID,
	PHISH_LEVEL_ID,
	LEVEL_COUNT,
	P0_GAME_COUNT,
	LEVEL_STATUS,
	ORACLE_PREDICTIONS,
	QUIZ_IDS,
	type BadgeId,
	type LevelStatus
} from '@/lib/constants'

export type BadgeStats = {
	doneLevelIds: ReadonlySet<string>
	correctPredictions: number
	// The P0 VS games the user has finished (they have a Leaderboard entry).
	finishedGameIds?: ReadonlySet<string>
	// The score of each quiz the user has taken.
	quizScores?: Partial<Record<string, number>>
}

/** Any activity on a level marks it in progress, except a finished level stays done. */
export function nextStatusOnActivity(current: LevelStatus | null): LevelStatus {
	return current === LEVEL_STATUS.done ? LEVEL_STATUS.done : LEVEL_STATUS.inProgress
}

export function canSkip(current: LevelStatus | null): boolean {
	return current === null || current === LEVEL_STATUS.inProgress
}

/** Done means Reveal reached and every Check question answered (DESIGN 10). */
export function isLevelComplete(input: {
	revealed: boolean
	answeredQuestionIds: ReadonlySet<string>
	level: Level
}): boolean {
	return (
		input.revealed &&
		input.level.check.questions.every((question) => input.answeredQuestionIds.has(question.id))
	)
}

// Badges earned from stored progress. right_tool and trickster are checked
// once, from the first play (first-play.ts); live_wire comes from recordDevRun.
const BADGE_RULES: { id: BadgeId; earned: (stats: BadgeStats) => boolean }[] = [
	{ id: BADGES.firstRace, earned: (stats) => stats.doneLevelIds.has(FIRST_LEVEL_ID) },
	{ id: BADGES.phishSpotter, earned: (stats) => stats.doneLevelIds.has(PHISH_LEVEL_ID) },
	{ id: BADGES.pathfinder, earned: (stats) => stats.doneLevelIds.size >= LEVEL_COUNT },
	{ id: BADGES.oracle, earned: (stats) => stats.correctPredictions >= ORACLE_PREDICTIONS },
	{
		id: BADGES.quizClimber,
		earned: ({ quizScores }) => {
			const start = quizScores?.[QUIZ_IDS.start]
			const end = quizScores?.[QUIZ_IDS.end]
			return start !== undefined && end !== undefined && end > start
		}
	},
	{ id: BADGES.gamer, earned: (stats) => (stats.finishedGameIds?.size ?? 0) >= P0_GAME_COUNT }
]

export function earnedBadges(stats: BadgeStats): BadgeId[] {
	return BADGE_RULES.filter((rule) => rule.earned(stats)).map((rule) => rule.id)
}
