import { describe, expect, it } from 'vitest'
import type { PriceTable } from '@/content/prices'
import { PROVIDERS } from '@/lib/constants'
import { cheapestPricedModel } from './model-list'

const SOURCE = 'https://example.com/pricing'
const PRICES: PriceTable = {
	checkedOn: '2026-10-04',
	models: {
		'claude-opus-5-5': {
			provider: PROVIDERS.anthropic,
			inputPerM: 5,
			outputPerM: 25,
			source: SOURCE
		},
		'claude-haiku-4-5': {
			provider: PROVIDERS.anthropic,
			inputPerM: 1,
			outputPerM: 5,
			source: SOURCE
		},
		'gemini-promo': {
			provider: PROVIDERS.google,
			inputPerM: 0.01,
			outputPerM: 0.01,
			source: SOURCE,
			validUntil: '2026-10-01'
		},
		'gemini-flash': { provider: PROVIDERS.google, inputPerM: 0.3, outputPerM: 2.5, source: SOURCE }
	}
}
const ON = new Date('2026-10-06T00:00:00.000Z')

describe('cheapestPricedModel', () => {
	it('picks the cheapest model the price table knows, never an unpriced one', () => {
		const models = [
			{ id: 'claude-fable-5', label: 'Claude Fable 5' },
			{ id: 'claude-haiku-4-5', label: 'Claude Haiku 4.5' },
			{ id: 'claude-opus-5-5', label: 'Claude Opus 5.5' }
		]
		expect(cheapestPricedModel(models, PRICES, ON)).toBe('claude-haiku-4-5')
	})

	it('skips a promotional price past its last day', () => {
		const models = [
			{ id: 'gemini-promo', label: 'Promo' },
			{ id: 'gemini-flash', label: 'Flash' }
		]
		expect(cheapestPricedModel(models, PRICES, ON)).toBe('gemini-flash')
	})

	it("uses OpenRouter's own prices and skips free models", () => {
		const models = [
			{ id: 'a/free', label: 'Free', inputPerM: 0, outputPerM: 0 },
			{ id: 'a/big', label: 'Big', inputPerM: 3, outputPerM: 15 },
			{ id: 'a/small', label: 'Small', inputPerM: 0.1, outputPerM: 0.4 },
			{ id: 'a/router', label: 'Router' }
		]
		expect(cheapestPricedModel(models, PRICES, ON)).toBe('a/small')
	})

	it('falls back to the first model when none has a price', () => {
		const models = [
			{ id: 'x', label: 'X' },
			{ id: 'y', label: 'Y' }
		]
		expect(cheapestPricedModel(models, PRICES, ON)).toBe('x')
		expect(cheapestPricedModel([], PRICES, ON)).toBeUndefined()
	})
})
