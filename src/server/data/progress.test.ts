import { beforeEach, describe, expect, it, vi } from 'vitest'
import { LEVELS } from '@/content/levels'
import { BADGES, LEVEL_STATUS } from '@/lib/constants'

const USER_ID = '3f2a4c1e-0b7d-4e55-9a10-2c6f1d8e9b42'
const fake = vi.hoisted(() => ({
	levelProgress: { findMany: vi.fn(), findUnique: vi.fn() },
	xpEvent: { aggregate: vi.fn() },
	userBadge: { findMany: vi.fn() },
	checkAnswer: { findMany: vi.fn() }
}))
vi.mock('@/server/db/client', () => ({ db: fake }))

const { getLevelProgress, getProgressSummary } = await import('./progress')

beforeEach(() => {
	vi.clearAllMocks()
})

describe('getProgressSummary', () => {
	it('keeps built levels only and sums xp and badges', async () => {
		fake.levelProgress.findMany.mockResolvedValue([
			{ levelId: 'speed-race', status: LEVEL_STATUS.done },
			{ levelId: 'ghost', status: LEVEL_STATUS.done }
		])
		fake.xpEvent.aggregate.mockResolvedValue({ _sum: { xp: 145 } })
		fake.userBadge.findMany.mockResolvedValue([{ badgeId: BADGES.firstRace }])

		const summary = await getProgressSummary(USER_ID)

		expect(summary).toEqual({
			statuses: { 'speed-race': LEVEL_STATUS.done },
			doneCount: 1,
			levelCount: LEVELS.size,
			xp: 145,
			badges: [BADGES.firstRace]
		})
		expect(fake.levelProgress.findMany).toHaveBeenCalledWith(
			expect.objectContaining({ where: { userId: USER_ID } })
		)
	})

	it('treats a null xp sum as 0', async () => {
		fake.levelProgress.findMany.mockResolvedValue([])
		fake.xpEvent.aggregate.mockResolvedValue({ _sum: { xp: null } })
		fake.userBadge.findMany.mockResolvedValue([])
		expect((await getProgressSummary(USER_ID)).xp).toBe(0)
	})
})

describe('getLevelProgress', () => {
	it('maps rows to the view', async () => {
		fake.levelProgress.findUnique.mockResolvedValue({
			status: LEVEL_STATUS.inProgress,
			prediction: { fastest: 'jev' },
			revealedAt: new Date(),
			opponentModelId: 'claude-opus-5-5',
			predictionCorrect: true
		})
		fake.checkAnswer.findMany.mockResolvedValue([
			{ questionId: 'q1', optionId: 'jev', correct: true }
		])

		const view = await getLevelProgress(USER_ID, 'speed-race')

		expect(view).toEqual({
			status: LEVEL_STATUS.inProgress,
			prediction: { fastest: 'jev' },
			revealed: true,
			opponentModelId: 'claude-opus-5-5',
			predictionCorrect: true,
			answers: { q1: { optionId: 'jev', correct: true } }
		})
		expect(fake.levelProgress.findUnique).toHaveBeenCalledWith({
			where: { userId_levelId: { userId: USER_ID, levelId: 'speed-race' } }
		})
		expect(fake.checkAnswer.findMany).toHaveBeenCalledWith({
			where: { userId: USER_ID, levelId: 'speed-race' }
		})
	})

	it('returns an empty view when nothing is saved and survives bad prediction JSON', async () => {
		fake.levelProgress.findUnique.mockResolvedValue(null)
		fake.checkAnswer.findMany.mockResolvedValue([])
		expect(await getLevelProgress(USER_ID, 'speed-race')).toEqual({
			status: null,
			prediction: {},
			revealed: false,
			opponentModelId: null,
			predictionCorrect: null,
			answers: {}
		})
		fake.levelProgress.findUnique.mockResolvedValue({
			status: LEVEL_STATUS.inProgress,
			prediction: 'not json',
			revealedAt: null,
			opponentModelId: null,
			predictionCorrect: null
		})
		expect((await getLevelProgress(USER_ID, 'speed-race')).prediction).toEqual({})
	})
})
