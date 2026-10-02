import { describe, expect, it } from 'vitest'
import { CLAUDE_MODELS } from '@/lib/constants'
import { jevRecord } from './jev-record'

describe('jevRecord', () => {
	it('counts Jev winning speed and cost against Opus in level 1, from the recordings', () => {
		const record = jevRecord([{ levelId: 'speed-race', opponentModelId: CLAUDE_MODELS.opus }])
		// Fastest and cheapest are Jev's; accuracy is a tie (39 of 40 each).
		expect(record).toEqual({ wins: 2, losses: 0 })
	})

	it('skips a level or opponent it has no recording for', () => {
		expect(
			jevRecord([
				{ levelId: 'no-such-level', opponentModelId: CLAUDE_MODELS.opus },
				{ levelId: 'speed-race', opponentModelId: 'no-such-model' }
			])
		).toEqual({ wins: 0, losses: 0 })
	})
})
