import { describe, expect, it } from 'vitest'
import { GAMES, nextGame } from './games'

describe('nextGame', () => {
	it('returns the game after the given one in listed order', () => {
		expect(nextGame(GAMES, 'guardrail-gauntlet')?.id).toBe('needle-hunt')
	})

	it('returns undefined after the last game or for an unknown id', () => {
		expect(nextGame(GAMES, 'citation-cop')?.id).toBe('inbox-keeper')
		expect(nextGame(GAMES, 'date-defense')).toBeUndefined()
		expect(nextGame(GAMES, 'nope')).toBeUndefined()
	})
})
