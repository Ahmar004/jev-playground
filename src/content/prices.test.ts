import { describe, expect, it } from 'vitest'
import { CLAUDE_MODELS, PROVIDERS, type Provider } from '@/lib/constants'
import { PRICES } from './prices'

describe('PRICES', () => {
	it('prices Jev and the three Claude models with a dated source', () => {
		expect(PRICES.checkedOn).toMatch(/^\d{4}-\d{2}-\d{2}$/)
		for (const modelId of ['jev-1.13.0', ...Object.values(CLAUDE_MODELS)]) {
			const entry = PRICES.models[modelId]
			expect(entry, modelId).toBeDefined()
			expect(entry?.source).toMatch(/^https:\/\//)
		}
	})

	it('charges nothing for Jev output tokens', () => {
		expect(PRICES.models['jev-1.13.0']?.outputPerM).toBe(0)
		expect(PRICES.models['typesafe/jev-1.13-20260917']?.outputPerM).toBe(0)
	})

	it('prices Jev through OpenRouter the same as TypeSafe does', () => {
		expect(PRICES.models['typesafe/jev-1.13-20260917']?.inputPerM).toBe(
			PRICES.models['jev-1.13.0']?.inputPerM
		)
	})
})

// Each provider's official pricing page; a price from anywhere else is a mistake.
const PRICING_PAGES: Partial<Record<Provider, string>> = {
	[PROVIDERS.typesafe]: 'https://docs.typesafe.ai/models',
	// Only Jev's own OpenRouter listing; other OpenRouter models use OpenRouter's live list.
	[PROVIDERS.openrouter]: 'https://openrouter.ai/api/v1/models/typesafe/jev-1.13/endpoints',
	[PROVIDERS.anthropic]: 'https://platform.claude.com/docs/en/about-claude/pricing',
	[PROVIDERS.openai]: 'https://developers.openai.com/api/docs/pricing',
	[PROVIDERS.google]: 'https://ai.google.dev/gemini-api/docs/pricing'
}

describe('PRICES for OpenAI and Google', () => {
	it('prices OpenAI and Google text models', () => {
		for (const modelId of ['gpt-6-astra', 'gpt-5.4-mini', 'gpt-4o', 'o3']) {
			expect(PRICES.models[modelId]?.provider, modelId).toBe(PROVIDERS.openai)
		}
		for (const modelId of ['gemini-3.8-flash', 'gemini-2.5-pro', 'gemini-2.5-flash-lite']) {
			expect(PRICES.models[modelId]?.provider, modelId).toBe(PROVIDERS.google)
		}
	})

	it("takes every price from its provider's official pricing page", () => {
		for (const [modelId, entry] of Object.entries(PRICES.models)) {
			expect(entry.source, modelId).toBe(PRICING_PAGES[entry.provider])
		}
	})

	it('ends each promotional price on the date its page gives', () => {
		for (const modelId of ['gemini-3.6-flash', 'gemini-3.7-flash', 'gemini-3.8-flash']) {
			expect(PRICES.models[modelId]?.validUntil, modelId).toBe('2026-12-31')
		}
		expect(PRICES.models['gpt-5.6-sol']?.validUntil).toBe('2026-11-21')
		expect(PRICES.models['gemini-2.5-flash']?.validUntil).toBeUndefined()
	})
})
