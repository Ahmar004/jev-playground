import { describe, expect, it, vi } from 'vitest'
import { PRICES as STORED_PRICES, type PriceTable } from '@/content/prices'
import { PROVIDER_ERROR_KINDS } from '@/lib/constants'
import { ProviderError } from './providers/provider-error'
import { codeRacer, jevRacer, llmRacer } from './racers'
import { choiceTask, codeDatesTask, item } from './testing/tasks'

const PRICES: PriceTable = {
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
		}
	}
}
const SIGNAL = new AbortController().signal

function jevText(choice: string): string {
	return JSON.stringify({
		model: 'jev-1.13.0',
		answers: { answer: { type: 'choice', choice, probabilities: {}, confidence: 0.9 } },
		usage: { input_tokens: 300, output_tokens: 20 }
	})
}

describe('jevRacer', () => {
	it('calls once, parses, scores and prices by the answering model', async () => {
		const call = vi.fn(async () => ({
			text: jevText('billing'),
			latencyMs: 140,
			usage: { inputTokens: 300, outputTokens: 20 },
			modelId: 'jev-1.13.0'
		}))
		const result = await jevRacer({ task: choiceTask, call, prices: PRICES })(
			item(choiceTask, 't1'),
			SIGNAL
		)
		expect(call).toHaveBeenCalledTimes(1)
		expect(result).toMatchObject({
			itemId: 't1',
			ok: true,
			credit: 1,
			correct: true,
			latencyMs: 140
		})
		expect(result.costUsd).toBeCloseTo((300 * 0.042) / 1_000_000)
	})

	it('records a provider error as a miss with its kind and body', async () => {
		const call = vi.fn(async () => {
			throw new ProviderError(PROVIDER_ERROR_KINDS.malformed, 422, '{"detail":"x"}', 30)
		})
		const result = await jevRacer({ task: choiceTask, call, prices: PRICES })(
			item(choiceTask, 't1'),
			SIGNAL
		)
		expect(result).toMatchObject({
			ok: false,
			raw: '{"detail":"x"}',
			parsed: null,
			credit: 0,
			correct: false,
			latencyMs: 30,
			costUsd: 0,
			error: 'malformed'
		})
	})

	it('rethrows anything that is not a provider error', async () => {
		const call = vi.fn(async () => {
			throw new DOMException('Aborted', 'AbortError')
		})
		await expect(
			jevRacer({ task: choiceTask, call, prices: PRICES })(item(choiceTask, 't1'), SIGNAL)
		).rejects.toThrow('Aborted')
	})
})

describe('llmRacer', () => {
	it('sends the built prompt and keeps an unparseable reply as a shown miss', async () => {
		const call = vi.fn(async (prompt: string) => {
			expect(prompt).toContain('Which team should handle this ticket?')
			return {
				text: 'I think billing.',
				latencyMs: 900,
				usage: { inputTokens: 500, outputTokens: 40 },
				modelId: 'claude-opus-5-5'
			}
		})
		const result = await llmRacer({
			task: choiceTask,
			modelId: 'claude-opus-5-5',
			call,
			prices: PRICES
		})(item(choiceTask, 't1'), SIGNAL)
		expect(result).toMatchObject({ ok: false, raw: 'I think billing.', parsed: null, credit: 0 })
		expect(result.costUsd).toBeCloseTo((500 * 4 + 40 * 20) / 1_000_000)
	})

	it('reports price unknown for a model with no stored price', async () => {
		const call = vi.fn(async () => ({
			text: '{"answer": "billing"}',
			latencyMs: 1,
			usage: { inputTokens: 1, outputTokens: 1 },
			modelId: 'some-model'
		}))
		const result = await llmRacer({
			task: choiceTask,
			modelId: 'some-model',
			call,
			prices: PRICES
		})(item(choiceTask, 't1'), SIGNAL)
		expect(result).toMatchObject({ ok: true, credit: 1, costUsd: null })
	})

	it('prices an OpenAI snapshot by the model the user picked, from the stored table', async () => {
		const call = vi.fn(async () => ({
			text: '{"answer": "billing"}',
			latencyMs: 1,
			usage: { inputTokens: 1000, outputTokens: 100 },
			modelId: 'gpt-5.4-mini-2026-03-17'
		}))
		const result = await llmRacer({
			task: choiceTask,
			modelId: 'gpt-5.4-mini',
			call,
			prices: STORED_PRICES
		})(item(choiceTask, 't1'), SIGNAL)
		expect(result.costUsd).toBeCloseTo((1000 * 0.75 + 100 * 4.5) / 1_000_000)
	})
})

describe('codeRacer', () => {
	it('runs the task code function for $0', async () => {
		const result = await codeRacer(codeDatesTask)(item(codeDatesTask, 'k1'), SIGNAL)
		expect(result).toMatchObject({ ok: true, parsed: 'first', credit: 1, costUsd: 0 })
		expect(result.usage).toEqual({ inputTokens: 0, outputTokens: 0 })
	})

	it('throws for a task without a code function', () => {
		expect(() => codeRacer(choiceTask)).toThrow()
	})
})
