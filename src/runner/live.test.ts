import { describe, expect, it } from 'vitest'
import { PROVIDER_ERROR_KINDS } from '@/lib/constants'
import { ProviderError } from './providers/provider-error'
import { stopOnProviderFailure } from './live'
import { choiceTask } from './testing/tasks'
import type { ItemResult, ItemRunner } from './types'

const item = choiceTask.items[0]!
const signal = new AbortController().signal

function result(error?: ItemResult['error']): ItemResult {
	return {
		itemId: item.id,
		ok: !error,
		raw: '',
		parsed: null,
		credit: error ? 0 : 1,
		correct: !error,
		latencyMs: 12,
		usage: { inputTokens: 0, outputTokens: 0 },
		costUsd: 0,
		error
	}
}

describe('stopOnProviderFailure', () => {
	it('passes a good result through', async () => {
		const runner: ItemRunner = async () => result()
		expect(await stopOnProviderFailure(runner)(item, signal)).toEqual(result())
	})

	it.each([
		PROVIDER_ERROR_KINDS.invalidKey,
		PROVIDER_ERROR_KINDS.forbidden,
		PROVIDER_ERROR_KINDS.rateLimited,
		PROVIDER_ERROR_KINDS.overloaded,
		PROVIDER_ERROR_KINDS.network
	])('stops the run on %s', async (kind) => {
		const runner: ItemRunner = async () => result(kind)
		const error = await stopOnProviderFailure(runner)(item, signal).catch((e: unknown) => e)
		expect(error).toBeInstanceOf(ProviderError)
		expect((error as ProviderError).kind).toBe(kind)
	})

	it('keeps a rejected item as a result, so level 2 can show it', async () => {
		const runner: ItemRunner = async () => result(PROVIDER_ERROR_KINDS.malformed)
		expect((await stopOnProviderFailure(runner)(item, signal)).error).toBe('malformed')
	})
})
