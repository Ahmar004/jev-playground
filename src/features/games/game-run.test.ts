import { describe, expect, it } from 'vitest'
import { MODES, RACERS } from '@/lib/constants'
import type { RunTotals } from '@/runner/types'
import { gameRunInput } from './game-run'

function totals(accuracy: number | null): RunTotals {
	return {
		items: 4,
		scored: 4,
		correct: 3,
		accuracy,
		wallMs: 1234.6,
		costUsd: 0.01,
		inputTokens: 1,
		outputTokens: 1,
		parseFailures: 0
	}
}
const run = { recordedAt: '2026-10-04T10:00:00.000Z', mode: MODES.developer }
const results = [
	{ racer: RACERS.jev, modelId: 'jev-1.13.0', totals: totals(0.75), ...run },
	{ racer: RACERS.llm, modelId: 'claude-opus-5-5', totals: totals(1), ...run }
]

describe('gameRunInput', () => {
	it('sends only ids in Beginner mode', () => {
		expect(gameRunInput({ gameId: 'needle-hunt', mode: MODES.beginner, results })).toEqual({
			mode: MODES.beginner,
			gameId: 'needle-hunt',
			opponentModelId: 'claude-opus-5-5'
		})
	})
	it('sends rounded numbers in Developer mode', () => {
		expect(gameRunInput({ gameId: 'needle-hunt', mode: MODES.developer, results })).toEqual({
			mode: MODES.developer,
			gameId: 'needle-hunt',
			results: [
				{ modelId: 'jev-1.13.0', accuracy: 0.75, wallMs: 1235, costUsd: 0.01 },
				{ modelId: 'claude-opus-5-5', accuracy: 1, wallMs: 1235, costUsd: 0.01 }
			]
		})
	})
	it('records only Jev and the LLM, never Jev + Code', () => {
		const withCode = [
			...results,
			{ racer: RACERS.jevCode, modelId: 'jev-1.13.0', totals: totals(0.5), ...run }
		]
		const input = gameRunInput({ gameId: 'g', mode: MODES.developer, results: withCode })
		expect(input?.mode === MODES.developer && input.results).toHaveLength(2)
	})
	it('skips racers with nothing scored and records nothing when none remain', () => {
		const none = results.map((result) => ({ ...result, totals: totals(null) }))
		expect(gameRunInput({ gameId: 'g', mode: MODES.developer, results: none })).toBeNull()
		expect(gameRunInput({ gameId: 'g', mode: MODES.beginner, results: [] })).toBeNull()
	})
})
