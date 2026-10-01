import { describe, expect, it } from 'vitest'
import { CLAUDE_MODELS } from '@/lib/constants'
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
	})
})
