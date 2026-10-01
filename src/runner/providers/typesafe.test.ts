import { afterEach, describe, expect, it, vi } from 'vitest'
import { PROVIDER_ERROR_KINDS } from '@/lib/constants'
import { ProviderError } from './provider-error'
import { callTypeSafe, TYPESAFE_URL } from './typesafe'

const KEY = 'ts-test-key-123'
const BODY = {
	model: 'jev-latest',
	state: 'Help! My payouts have been failing for 3 days.',
	questions: { answer: { type: 'noul' as const, instructions: 'Does this convey urgency?' } }
}
const OK_BODY = JSON.stringify({
	model: 'jev-1.13.0',
	answers: { answer: { type: 'noul', noul: 0.95 } },
	usage: { input_tokens: 296, output_tokens: 20 }
})

function mockFetch(response: Response | Error) {
	const fetchMock = vi.fn<typeof fetch>(async () => {
		if (!(response instanceof Response)) throw response
		return response
	})
	vi.stubGlobal('fetch', fetchMock)
	return fetchMock
}

async function failure(promise: Promise<unknown>): Promise<ProviderError> {
	try {
		await promise
	} catch (error) {
		if (error instanceof ProviderError) return error
		throw error
	}
	throw new Error('Expected a ProviderError')
}

afterEach(() => vi.unstubAllGlobals())

describe('callTypeSafe', () => {
	it('posts the body with the key in the Authorization header only', async () => {
		const fetchMock = mockFetch(new Response(OK_BODY, { status: 200 }))
		await callTypeSafe(BODY, KEY)
		const [url, init] = fetchMock.mock.calls[0] ?? []
		expect(String(url)).toBe(TYPESAFE_URL)
		expect(String(url)).not.toContain(KEY)
		expect(init?.method).toBe('POST')
		expect(new Headers(init?.headers).get('authorization')).toBe(`Bearer ${KEY}`)
		expect(JSON.parse(String(init?.body))).toEqual(BODY)
	})

	it('returns the body text, versioned model, token usage and latency', async () => {
		mockFetch(new Response(OK_BODY, { status: 200 }))
		const result = await callTypeSafe(BODY, KEY)
		expect(result.text).toBe(OK_BODY)
		expect(result.modelId).toBe('jev-1.13.0')
		expect(result.usage).toEqual({ inputTokens: 296, outputTokens: 20 })
		expect(result.latencyMs).toBeGreaterThanOrEqual(0)
	})

	it.each([
		[400, PROVIDER_ERROR_KINDS.malformed],
		[401, PROVIDER_ERROR_KINDS.invalidKey],
		[403, PROVIDER_ERROR_KINDS.forbidden],
		[422, PROVIDER_ERROR_KINDS.malformed],
		[429, PROVIDER_ERROR_KINDS.rateLimited],
		[500, PROVIDER_ERROR_KINDS.unknown],
		[503, PROVIDER_ERROR_KINDS.overloaded],
		[529, PROVIDER_ERROR_KINDS.overloaded]
	])('maps status %i to %s', async (status, kind) => {
		mockFetch(new Response('{"detail":"x"}', { status }))
		const error = await failure(callTypeSafe(BODY, KEY))
		expect(error.kind).toBe(kind)
		expect(error.status).toBe(status)
		expect(error.message).not.toContain(KEY)
	})

	it('keeps a 422 body to show, but drops the body of an auth failure', async () => {
		mockFetch(new Response('{"detail":"questions.answer.type"}', { status: 422 }))
		expect((await failure(callTypeSafe(BODY, KEY))).body).toContain('questions.answer.type')
		mockFetch(new Response('{"detail":"bad key"}', { status: 401 }))
		expect((await failure(callTypeSafe(BODY, KEY))).body).toBe('')
	})

	it('maps a failed request to network', async () => {
		mockFetch(new TypeError('Failed to fetch'))
		expect((await failure(callTypeSafe(BODY, KEY))).kind).toBe(PROVIDER_ERROR_KINDS.network)
	})

	it('rethrows an abort instead of turning it into a provider error', async () => {
		const controller = new AbortController()
		controller.abort()
		mockFetch(new DOMException('Aborted', 'AbortError'))
		await expect(callTypeSafe(BODY, KEY, controller.signal)).rejects.toThrow('Aborted')
	})

	it('maps a 200 body that is not a TypeSafe response to unknown', async () => {
		mockFetch(new Response('<html>', { status: 200 }))
		expect((await failure(callTypeSafe(BODY, KEY))).kind).toBe(PROVIDER_ERROR_KINDS.unknown)
	})

	it('calls fetch exactly once, with no retry', async () => {
		const fetchMock = mockFetch(new Response('{}', { status: 529 }))
		await failure(callTypeSafe(BODY, KEY))
		expect(fetchMock).toHaveBeenCalledTimes(1)
	})
})
