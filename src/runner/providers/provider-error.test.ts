import { afterEach, describe, expect, it, vi } from 'vitest'
import { PROVIDER_ERROR_KINDS, RUN_STOPPING_ERRORS } from '@/lib/constants'
import { errorKindForStatus, ProviderError, timedFetch } from './provider-error'

const SHORT_TIMEOUT_MS = 20

// A provider that never answers: the request only ends when its signal aborts.
function hangingFetch() {
	const fetchMock = vi.fn<typeof fetch>(
		(_url, init) =>
			new Promise((_resolve, reject) => {
				init?.signal?.addEventListener('abort', () => reject(init.signal?.reason))
			})
	)
	vi.stubGlobal('fetch', fetchMock)
	return fetchMock
}

afterEach(() => vi.unstubAllGlobals())

describe('timedFetch timeout', () => {
	it('stops a call that never answers with a timeout error', async () => {
		const fetchMock = hangingFetch()
		const error = await timedFetch('https://x.test', {}, undefined, SHORT_TIMEOUT_MS).catch(
			(caught: unknown) => caught
		)
		expect(error).toBeInstanceOf(ProviderError)
		expect((error as ProviderError).kind).toBe(PROVIDER_ERROR_KINDS.timeout)
		expect((error as ProviderError).latencyMs).toBeGreaterThanOrEqual(SHORT_TIMEOUT_MS - 5)
		expect(fetchMock).toHaveBeenCalledTimes(1)
	})

	it("rethrows the caller's own abort, not a timeout", async () => {
		hangingFetch()
		const controller = new AbortController()
		const call = timedFetch('https://x.test', {}, controller.signal, 10_000)
		controller.abort()
		await expect(call).rejects.not.toBeInstanceOf(ProviderError)
	})

	it('returns a response that arrives in time', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn<typeof fetch>(async () => new Response('{"ok":true}'))
		)
		const result = await timedFetch('https://x.test', {}, undefined, SHORT_TIMEOUT_MS)
		expect(result.text).toBe('{"ok":true}')
	})

	it("maps our pass-through's 504 to a timeout", () => {
		expect(errorKindForStatus(504)).toBe(PROVIDER_ERROR_KINDS.timeout)
	})

	it('stops the live run on a timeout, since the next call would hang too', () => {
		expect(RUN_STOPPING_ERRORS).toContain(PROVIDER_ERROR_KINDS.timeout)
	})
})
