import { describe, expect, it } from 'vitest'
import { CLAUDE_MODELS } from '@/lib/constants'
import { PRESETS, presetView, presetViews } from './arena'

describe('arena presets', () => {
	it('has the 8 presets of DESIGN 9', () => {
		expect([...PRESETS.keys()]).toEqual([
			'ticket-triage',
			'prompt-injection',
			'review-rating',
			'product-match',
			'citation-check',
			'intent-routing',
			'date-comparison',
			'phishing-fan-out'
		])
	})

	it('gives every preset Jev and all three Claude models, each with a result for its one item', () => {
		for (const view of presetViews()) {
			expect(view.task.items).toHaveLength(1)
			expect(view.jev?.result.itemId).toBe(view.preset.itemId)
			expect(view.opponents.map((side) => side.modelId).sort()).toEqual(
				Object.values(CLAUDE_MODELS).sort()
			)
			for (const side of view.opponents) expect(side.result.itemId).toBe(view.preset.itemId)
		}
	})

	it('shows the stored answer as text, and nothing for an unknown preset', () => {
		expect(presetView('product-match')?.expected).toBe('no')
		expect(presetView('nope')).toBeUndefined()
	})
})
