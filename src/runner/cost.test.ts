import { describe, expect, it } from 'vitest'
import { costUsd, priceFor } from './cost'

const TABLE = {
	checkedOn: '2026-10-01',
	models: {
		'jev-1.13.0': {
			provider: 'typesafe',
			inputPerM: 0.042,
			outputPerM: 0,
			source: 'https://docs.typesafe.ai/models'
		},
		'claude-opus-5-5': {
			provider: 'anthropic',
			inputPerM: 4,
			outputPerM: 20,
			source: 'https://platform.claude.com/x'
		},
		'gemini-promo': {
			provider: 'google',
			inputPerM: 0.75,
			outputPerM: 3.75,
			source: 'https://ai.google.dev/x',
			validUntil: '2026-12-31'
		}
	}
} as const

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

	it('ignores inherited object keys', () => {
		expect(priceFor(TABLE, ['constructor', 'toString'])).toBeNull()
	})
})

describe('priceFor with a price that ends', () => {
	it('uses a price through the last day it is valid (UTC)', () => {
		const lastMoment = new Date('2026-12-31T23:59:59Z')
		expect(priceFor(TABLE, ['gemini-promo'], lastMoment)?.inputPerM).toBe(0.75)
	})

	it('treats a price past its end date as unknown, never as the old number', () => {
		const nextDay = new Date('2027-01-01T00:00:00Z')
		expect(priceFor(TABLE, ['gemini-promo'], nextDay)).toBeNull()
		expect(priceFor(TABLE, ['gemini-promo', 'claude-opus-5-5'], nextDay)?.inputPerM).toBe(4)
	})

	it('keeps a price with no end date valid on any day', () => {
		expect(priceFor(TABLE, ['jev-1.13.0'], new Date('2099-01-01T00:00:00Z'))?.inputPerM).toBe(0.042)
	})
})
