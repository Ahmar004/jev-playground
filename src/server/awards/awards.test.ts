import { describe, expect, it, vi } from 'vitest'
import { BADGES, FIRST_LEVEL_ID, LEVEL_STATUS, XP_AMOUNTS, XP_SOURCES } from '@/lib/constants'
import { awardXp, syncBadges, type Tx } from './awards'

const USER_ID = '3f2a4c1e-0b7d-4e55-9a10-2c6f1d8e9b42'

function fakeTx(options: {
	xpCount?: number
	doneLevelIds?: string[]
	correct?: number
	badgeCounts?: number[]
}) {
	const badgeCounts = [...(options.badgeCounts ?? [])]
	const tx = {
		xpEvent: { createMany: vi.fn(async () => ({ count: options.xpCount ?? 1 })) },
		levelProgress: {
			findMany: vi.fn(async () => (options.doneLevelIds ?? []).map((levelId) => ({ levelId }))),
			count: vi.fn(async () => options.correct ?? 0)
		},
		leaderboardEntry: { findMany: vi.fn(async () => []) },
		userBadge: { createMany: vi.fn(async () => ({ count: badgeCounts.shift() ?? 1 })) }
	}
	return { tx, asTx: tx as unknown as Tx }
}

describe('awardXp', () => {
	it('returns the amount when the award is new', async () => {
		const { tx, asTx } = fakeTx({ xpCount: 1 })
		const xp = await awardXp(asTx, USER_ID, XP_SOURCES.checkCorrect, 'q1')
		expect(xp).toBe(XP_AMOUNTS[XP_SOURCES.checkCorrect])
		expect(tx.xpEvent.createMany).toHaveBeenCalledWith({
			data: [
				{
					userId: USER_ID,
					source: XP_SOURCES.checkCorrect,
					sourceId: 'q1',
					xp: XP_AMOUNTS[XP_SOURCES.checkCorrect]
				}
			],
			skipDuplicates: true
		})
	})

	it('returns 0 on a repeat', async () => {
		const { asTx } = fakeTx({ xpCount: 0 })
		expect(await awardXp(asTx, USER_ID, XP_SOURCES.levelDone, 'speed-race')).toBe(0)
	})
})

describe('syncBadges', () => {
	it('returns only the badges created now', async () => {
		const { asTx } = fakeTx({
			doneLevelIds: [FIRST_LEVEL_ID],
			correct: 5,
			// first_race is new, oracle was already earned
			badgeCounts: [1, 0]
		})
		expect(await syncBadges(asTx, USER_ID)).toEqual([BADGES.firstRace])
	})

	it('scopes both reads to the user', async () => {
		const { tx, asTx } = fakeTx({})
		await syncBadges(asTx, USER_ID)
		expect(tx.levelProgress.findMany).toHaveBeenCalledWith({
			where: { userId: USER_ID, status: LEVEL_STATUS.done },
			select: { levelId: true }
		})
		expect(tx.levelProgress.count).toHaveBeenCalledWith({
			where: { userId: USER_ID, predictionCorrect: true }
		})
	})

	it('ignores done rows for levels that do not exist', async () => {
		const stale = Array.from({ length: 8 }, (_, index) => `ghost-${index}`)
		const { tx, asTx } = fakeTx({ doneLevelIds: stale })
		expect(await syncBadges(asTx, USER_ID)).toEqual([])
		expect(tx.userBadge.createMany).not.toHaveBeenCalled()
	})
})
