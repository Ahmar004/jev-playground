import { describe, expect, it } from 'vitest'
import { levelSchema } from '@/content/level-schema'
import { testLevel } from '@/content/testing/levels'
import {
	BADGES,
	FIRST_LEVEL_ID,
	LEVEL_COUNT,
	LEVEL_STATUS,
	ORACLE_PREDICTIONS,
	PHISH_LEVEL_ID
} from '@/lib/constants'
import { canSkip, earnedBadges, isLevelComplete, nextStatusOnActivity } from './rules'

const level = levelSchema.parse(testLevel)

describe('nextStatusOnActivity', () => {
	it('marks activity in progress and never downgrades done', () => {
		expect(nextStatusOnActivity(null)).toBe(LEVEL_STATUS.inProgress)
		expect(nextStatusOnActivity(LEVEL_STATUS.skipped)).toBe(LEVEL_STATUS.inProgress)
		expect(nextStatusOnActivity(LEVEL_STATUS.inProgress)).toBe(LEVEL_STATUS.inProgress)
		expect(nextStatusOnActivity(LEVEL_STATUS.done)).toBe(LEVEL_STATUS.done)
	})
})

describe('canSkip', () => {
	it('allows skipping only a level that is new or in progress', () => {
		expect(canSkip(null)).toBe(true)
		expect(canSkip(LEVEL_STATUS.inProgress)).toBe(true)
		expect(canSkip(LEVEL_STATUS.skipped)).toBe(false)
		expect(canSkip(LEVEL_STATUS.done)).toBe(false)
	})
})

describe('isLevelComplete', () => {
	const ids = level.check.questions.map((question) => question.id)
	it('needs Reveal and every Check question answered', () => {
		expect(isLevelComplete({ revealed: false, answeredQuestionIds: new Set(ids), level })).toBe(
			false
		)
		expect(
			isLevelComplete({ revealed: true, answeredQuestionIds: new Set(ids.slice(0, 1)), level })
		).toBe(false)
		expect(isLevelComplete({ revealed: true, answeredQuestionIds: new Set(ids), level })).toBe(true)
	})
})

describe('earnedBadges, quiz_climber', () => {
	const base = { doneLevelIds: new Set<string>(), correctPredictions: 0 }
	it('needs a higher end score than start score', () => {
		expect(earnedBadges({ ...base, quizScores: { start: 3, end: 5 } })).toContain(
			BADGES.quizClimber
		)
		expect(earnedBadges({ ...base, quizScores: { start: 5, end: 5 } })).not.toContain(
			BADGES.quizClimber
		)
		expect(earnedBadges({ ...base, quizScores: { end: 8 } })).not.toContain(BADGES.quizClimber)
	})
})

describe('earnedBadges', () => {
	const ids = (count: number) => new Set(Array.from({ length: count }, (_, i) => `level-${i}`))
	const stats = (correctPredictions: number) => ({
		doneLevelIds: new Set<string>(),
		correctPredictions
	})

	it('awards First Race for finishing level 1', () => {
		expect(
			earnedBadges({ doneLevelIds: new Set([FIRST_LEVEL_ID]), correctPredictions: 0 })
		).toEqual([BADGES.firstRace])
	})

	it('awards Phish Spotter for finishing level 7', () => {
		expect(
			earnedBadges({ doneLevelIds: new Set([PHISH_LEVEL_ID]), correctPredictions: 0 })
		).toEqual([BADGES.phishSpotter])
	})

	it('awards Oracle at the prediction threshold', () => {
		expect(earnedBadges(stats(ORACLE_PREDICTIONS))).toContain(BADGES.oracle)
		expect(earnedBadges(stats(ORACLE_PREDICTIONS - 1))).not.toContain(BADGES.oracle)
	})

	it('awards Pathfinder at all levels', () => {
		expect(earnedBadges({ doneLevelIds: ids(LEVEL_COUNT), correctPredictions: 0 })).toContain(
			BADGES.pathfinder
		)
		expect(
			earnedBadges({ doneLevelIds: ids(LEVEL_COUNT - 1), correctPredictions: 0 })
		).not.toContain(BADGES.pathfinder)
	})

	it('follows BADGES declaration order', () => {
		const result = earnedBadges({
			doneLevelIds: new Set([FIRST_LEVEL_ID, ...ids(LEVEL_COUNT)]),
			correctPredictions: ORACLE_PREDICTIONS
		})
		expect(result).toEqual([BADGES.firstRace, BADGES.pathfinder, BADGES.oracle])
	})
})
