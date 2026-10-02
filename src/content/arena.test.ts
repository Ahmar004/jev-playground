import { describe, expect, it } from 'vitest'
import { CLAUDE_MODELS } from '@/lib/constants'
import { batchPresetIds, batchView, PRESETS, presetView, presetViews } from './arena'

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

	it('offers batch mode only for presets whose task has enough items, with the whole task and its recordings', () => {
		const ids = batchPresetIds()
		expect(ids).toEqual([
			'ticket-triage',
			'prompt-injection',
			'review-rating',
			'product-match',
			'citation-check',
			'intent-routing'
		])
		for (const id of ids) {
			const view = batchView(id)
			expect(view?.task.items.length).toBeGreaterThanOrEqual(12)
			expect(view?.recordings.length).toBe(4)
			expect(presetView(id)?.batchItems).toBe(view?.task.items.length)
		}
		expect(batchView('date-comparison')).toBeUndefined()
		expect(presetView('date-comparison')?.batchItems).toBeNull()
	})
})
