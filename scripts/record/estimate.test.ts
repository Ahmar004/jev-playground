// @vitest-environment node
import { describe, expect, it } from 'vitest'
import type { PriceTable } from '@/content/prices'
import { buildJevRequest } from '@/runner/jev-request'
import { buildLlmPrompt } from '@/runner/llm-prompt'
import { choiceTask } from '@/runner/testing/tasks'
import {
	CHARS_PER_TOKEN,
	creditShortfall,
	estimateTarget,
	LLM_OUTPUT_ALLOWANCE_TOKENS
} from './estimate'

const prices: PriceTable = {
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
			source: 'https://example.com/pricing'
		}
	}
}

describe('estimateTarget', () => {
	it('counts Jev input as characters / 4 of each request body, output free', () => {
		const chars = choiceTask.items.reduce(
			(sum, item) => sum + JSON.stringify(buildJevRequest(choiceTask, item)).length,
			0
		)
		const estimate = estimateTarget(
			choiceTask,
			{ taskId: choiceTask.id, racer: 'jev', modelId: 'jev-latest', slug: 'jev' },
			prices
		)
		const inputTokens = choiceTask.items.reduce(
			(sum, item) =>
				sum + Math.ceil(JSON.stringify(buildJevRequest(choiceTask, item)).length / CHARS_PER_TOKEN),
			0
		)
		expect(chars).toBeGreaterThan(0)
		expect(estimate).toEqual({
			calls: choiceTask.items.length,
			inputTokens,
			outputTokens: 0,
			costUsd: (inputTokens * 0.042) / 1_000_000
		})
	})

	it('adds the output allowance per LLM call', () => {
		const target = {
			taskId: choiceTask.id,
			racer: 'llm' as const,
			modelId: 'claude-opus-5-5',
			slug: 'claude-opus-5-5'
		}
		const inputTokens = choiceTask.items.reduce(
			(sum, item) => sum + Math.ceil(buildLlmPrompt(choiceTask, item).length / CHARS_PER_TOKEN),
			0
		)
		const outputTokens = choiceTask.items.length * LLM_OUTPUT_ALLOWANCE_TOKENS
		expect(estimateTarget(choiceTask, target, prices)).toEqual({
			calls: choiceTask.items.length,
			inputTokens,
			outputTokens,
			costUsd: (inputTokens * 4 + outputTokens * 20) / 1_000_000
		})
	})

	it('reports price unknown for a model with no stored price', () => {
		const target = {
			taskId: choiceTask.id,
			racer: 'llm' as const,
			modelId: 'claude-sonnet-5-5',
			slug: 'claude-sonnet-5-5'
		}
		expect(estimateTarget(choiceTask, target, prices).costUsd).toBeNull()
	})
})

describe('creditShortfall', () => {
	it('allows a run that fits in the credit left', () => {
		expect(creditShortfall({ spentUsd: 5, estimateUsd: 10, creditUsd: 20 })).toBeNull()
		expect(creditShortfall({ spentUsd: 10, estimateUsd: 10, creditUsd: 20 })).toBeNull()
	})

	it('refuses a run whose estimate would pass the credit', () => {
		expect(creditShortfall({ spentUsd: 15, estimateUsd: 6, creditUsd: 20 })).toMatch(
			/\$6\.0000.*\$15\.0000.*\$20/
		)
	})

	it('refuses a run with an unknown price, since its cost cannot be checked', () => {
		expect(creditShortfall({ spentUsd: 0, estimateUsd: null, creditUsd: 20 })).toMatch(
			/price unknown/
		)
	})
})
