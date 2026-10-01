// @vitest-environment node
import { describe, expect, it } from 'vitest'
import type { PriceTable } from '@/content/prices'
import { recordingSchema } from '@/content/recording-schema'
import { taskHash } from '@/content/task-hash'
import { PROVIDER_ERROR_KINDS } from '@/lib/constants'
import { ProviderError } from '@/runner/providers/provider-error'
import { choiceTask } from '@/runner/testing/tasks'
import type { ProviderResult } from '@/runner/types'
import { recordTarget, type ProviderCalls } from './record-target'

const prices: PriceTable = {
	checkedOn: '2026-10-01',
	models: {
		'jev-1.13.0': { inputPerM: 0.042, outputPerM: 0, source: 'https://docs.typesafe.ai/models' },
		'claude-opus-5-5': { inputPerM: 4, outputPerM: 20, source: 'https://example.com/pricing' }
	}
}
// t3 has no label (not scored); any valid option will do for it.
const UNSCORED_CHOICE = 'sales'
const label = (itemId: string) => {
	const found = choiceTask.items.find((item) => item.id === itemId)?.label
	return typeof found === 'string' ? found : UNSCORED_CHOICE
}
const jevTarget = {
	taskId: choiceTask.id,
	racer: 'jev',
	modelId: 'jev-latest',
	slug: 'jev'
} as const
const opusTarget = {
	taskId: choiceTask.id,
	racer: 'llm',
	modelId: 'claude-opus-5-5',
	slug: 'claude-opus-5-5'
} as const

function jevReply(choice: string, model = 'jev-1.13.0'): ProviderResult {
	return {
		text: JSON.stringify({
			model,
			answers: {
				answer: { type: 'choice', choice, probabilities: { [choice]: 0.9 }, confidence: 0.9 }
			},
			usage: { input_tokens: 100, output_tokens: 3 }
		}),
		latencyMs: 40,
		usage: { inputTokens: 100, outputTokens: 3 },
		modelId: model
	}
}

function calls(overrides: Partial<ProviderCalls> = {}): ProviderCalls {
	return {
		jev: async (body) => {
			const state = JSON.stringify(body.state)
			const item = choiceTask.items.find((entry) => JSON.stringify(entry.state) === state)
			return jevReply(item ? label(item.id) : 'none')
		},
		llm: async (modelId) => ({
			text: '{"answer": "not-an-option"}',
			latencyMs: 300,
			usage: { inputTokens: 200, outputTokens: 50 },
			modelId
		}),
		...overrides
	}
}

const recordedAt = new Date('2026-10-01T12:00:00.000Z')

describe('recordTarget', () => {
	it('records Jev as a valid Recording named after the answering version', async () => {
		const recording = await recordTarget(choiceTask, jevTarget, {
			calls: calls(),
			prices,
			recordedAt
		})
		expect(recordingSchema.parse(recording)).toEqual(recording)
		expect(recording).toMatchObject({
			taskId: choiceTask.id,
			taskHash: taskHash(choiceTask),
			racer: 'jev',
			modelId: 'jev-1.13.0',
			recordedAt: '2026-10-01T12:00:00.000Z',
			price: prices.models['jev-1.13.0'],
			lanes: 4
		})
		expect(recording.events.map((event) => event.itemId)).toEqual(
			choiceTask.items.map((item) => item.id)
		)
		expect(recording.totals.accuracy).toBe(1)
		for (const event of recording.events) expect(event.endMs).toBeGreaterThanOrEqual(event.startMs)
	})

	it('stores a wrong LLM answer as a miss, unedited (R44, spec 12.4)', async () => {
		const recording = await recordTarget(choiceTask, opusTarget, {
			calls: calls(),
			prices,
			recordedAt
		})
		expect(recording.modelId).toBe('claude-opus-5-5')
		expect(recording.totals.correct).toBe(0)
		expect(recording.events[0]).toMatchObject({
			raw: '{"answer": "not-an-option"}',
			correct: false
		})
		expect(recording.totals.costUsd).toBeCloseTo(
			(choiceTask.items.length * (200 * 4 + 50 * 20)) / 1_000_000
		)
	})

	it('passes the requested model id to the LLM call', async () => {
		const seen: string[] = []
		await recordTarget(choiceTask, opusTarget, {
			calls: calls({
				llm: async (modelId) => {
					seen.push(modelId)
					return {
						text: '{"answer": "x"}',
						latencyMs: 1,
						usage: { inputTokens: 1, outputTokens: 1 },
						modelId
					}
				}
			}),
			prices,
			recordedAt
		})
		expect(new Set(seen)).toEqual(new Set(['claude-opus-5-5']))
	})

	it('refuses to write a run answered by two different models', async () => {
		let n = 0
		const mixed = calls({
			jev: async () => {
				n += 1
				return jevReply('a', n === 1 ? 'jev-1.13.0' : 'jev-1.14.0')
			}
		})
		await expect(
			recordTarget(choiceTask, jevTarget, { calls: mixed, prices, recordedAt })
		).rejects.toThrow(/jev-1.13.0.*jev-1.14.0|jev-1.14.0.*jev-1.13.0/)
	})

	it('throws when aborted, so nothing is written', async () => {
		const controller = new AbortController()
		controller.abort()
		await expect(
			recordTarget(choiceTask, jevTarget, {
				calls: calls(),
				prices,
				recordedAt,
				signal: controller.signal
			})
		).rejects.toThrow(/aborted/i)
	})

	it('refuses an LLM run answered by a model other than the requested one', async () => {
		const drifted = calls({
			llm: async () => ({
				text: '{"answer": "billing"}',
				latencyMs: 1,
				usage: { inputTokens: 1, outputTokens: 1 },
				modelId: 'claude-opus-5-5-20260101'
			})
		})
		await expect(
			recordTarget(choiceTask, opusTarget, { calls: drifted, prices, recordedAt })
		).rejects.toThrow(
			/claude-opus-5-5-20260101.*claude-opus-5-5|claude-opus-5-5.*claude-opus-5-5-20260101/
		)
	})

	it('refuses a run where every call failed, naming the error kinds', async () => {
		const failing = calls({
			jev: async () => {
				throw new ProviderError(PROVIDER_ERROR_KINDS.invalidKey, 401, '', 5)
			}
		})
		await expect(
			recordTarget(choiceTask, jevTarget, { calls: failing, prices, recordedAt })
		).rejects.toThrow(new RegExp(`${PROVIDER_ERROR_KINDS.invalidKey}.*nothing was written`))
	})

	it('records a run with one failed call among successes, as it happened (R44)', async () => {
		let n = 0
		const flaky = calls({
			jev: async (body) => {
				n += 1
				if (n === 1) throw new ProviderError(PROVIDER_ERROR_KINDS.overloaded, 529, '', 5)
				return jevReply(JSON.stringify(body).length > 0 ? 'billing' : 'none')
			}
		})
		const recording = await recordTarget(choiceTask, jevTarget, {
			calls: flaky,
			prices,
			recordedAt
		})
		const failed = recording.events.filter((event) => event.error)
		expect(failed).toHaveLength(1)
		expect(failed[0]?.error).toBe(PROVIDER_ERROR_KINDS.overloaded)
		expect(recording.events).toHaveLength(choiceTask.items.length)
	})
})
