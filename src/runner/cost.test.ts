import { describe, expect, it } from 'vitest'
import { costUsd, priceFor } from './cost'

const TABLE = {
	checkedOn: '2026-10-01',
	models: {
		'jev-1.13.0': { inputPerM: 0.042, outputPerM: 0, source: 'https://docs.typesafe.ai/models' },
		'claude-opus-5-5': { inputPerM: 4, outputPerM: 20, source: 'https://platform.claude.com/x' }
	}
}

describe('costUsd', () => {
	it('is tokens times the per-million price', () => {
		expect(
			costUsd({ inputTokens: 1000, outputTokens: 500 }, TABLE.models['claude-opus-5-5'])
		).toBeCloseTo(0.014)
	})

	it('never charges Jev output tokens', () => {
		expect(
			costUsd({ inputTokens: 1_000_000, outputTokens: 999 }, TABLE.models['jev-1.13.0'])
		).toBeCloseTo(0.042)
	})

	it('is null when the price is unknown', () => {
		expect(costUsd({ inputTokens: 1, outputTokens: 1 }, null)).toBeNull()
	})
})

describe('priceFor', () => {
	it('returns the first model id with a price', () => {
		expect(priceFor(TABLE, ['jev-9.9.9', 'jev-1.13.0'])?.inputPerM).toBe(0.042)
		expect(priceFor(TABLE, ['gpt-x'])).toBeNull()
	})
})
