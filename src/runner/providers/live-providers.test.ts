import { afterEach, describe, expect, it, vi } from 'vitest'
import { PROVIDERS, PROVIDER_ERROR_KINDS } from '@/lib/constants'
import { callGoogle } from './google'
import { fetchModels } from './model-list'
import { callOpenAi, callOpenRouter, OPENAI_URL, OPENROUTER_URL } from './openai-compat'
import { ProviderError } from './provider-error'
import { callTypeSafe, JEV_PROXY_URL, upstreamMs } from './typesafe'

const KEY = 'sk-live-test-key-555'

function mockFetch(response: Response) {
	const fetchMock = vi.fn<typeof fetch>(async () => response)
	vi.stubGlobal('fetch', fetchMock)
	return fetchMock
}

afterEach(() => vi.unstubAllGlobals())

describe('chat completions (OpenAI, OpenRouter)', () => {
	const body = JSON.stringify({
		model: 'gpt-x-2026',
		choices: [{ message: { content: '{"answer":"billing"}' } }],
		usage: { prompt_tokens: 120, completion_tokens: 9 }
	})

	it('posts the prompt with the key in the Authorization header only', async () => {
		const fetchMock = mockFetch(new Response(body))
		const result = await callOpenAi('gpt-x', 'hello', KEY)
		const [url, init] = fetchMock.mock.calls[0] ?? []
		expect(String(url)).toBe(OPENAI_URL)
		expect(String(url)).not.toContain(KEY)
		expect(new Headers(init?.headers).get('authorization')).toBe(`Bearer ${KEY}`)
		expect(JSON.parse(String(init?.body)).messages).toEqual([{ role: 'user', content: 'hello' }])
		expect(result).toMatchObject({
			text: '{"answer":"billing"}',
			modelId: 'gpt-x-2026',
			usage: { inputTokens: 120, outputTokens: 9 }
		})
	})

	it('calls OpenRouter at its own URL', async () => {
		const fetchMock = mockFetch(new Response(body))
		await callOpenRouter('anthropic/claude-x', 'hi', KEY)
		expect(String(fetchMock.mock.calls[0]?.[0])).toBe(OPENROUTER_URL)
	})

	it('maps a 401 to an invalid-key error that keeps no body', async () => {
		mockFetch(new Response('{"error":{"message":"bad key sk-live-test-key-555"}}', { status: 401 }))
		const error = await callOpenAi('gpt-x', 'hi', KEY).catch((e: unknown) => e)
		expect(error).toBeInstanceOf(ProviderError)
		expect((error as ProviderError).kind).toBe(PROVIDER_ERROR_KINDS.invalidKey)
		expect((error as ProviderError).body).toBe('')
	})
})

describe('callGoogle', () => {
	it('sends the key in x-goog-api-key, never in the URL, and counts thinking as output', async () => {
		const fetchMock = mockFetch(
			new Response(
				JSON.stringify({
					candidates: [{ content: { parts: [{ text: '{"answer":' }, { text: '"x"}' }] } }],
					usageMetadata: { promptTokenCount: 50, candidatesTokenCount: 5, thoughtsTokenCount: 30 },
					modelVersion: 'gemini-2.5-flash'
				})
			)
		)
		const result = await callGoogle('gemini-2.5-flash', 'hi', KEY)
		const [url, init] = fetchMock.mock.calls[0] ?? []
		expect(String(url)).toContain('/models/gemini-2.5-flash:generateContent')
		expect(String(url)).not.toContain('key=')
		expect(String(url)).not.toContain(KEY)
		expect(new Headers(init?.headers).get('x-goog-api-key')).toBe(KEY)
		expect(result.text).toBe('{"answer":"x"}')
		expect(result.usage).toEqual({ inputTokens: 50, outputTokens: 35 })
	})
})

describe('TypeSafe through the pass-through', () => {
	const ok = JSON.stringify({
		model: 'jev-1.13.0',
		answers: {},
		usage: { input_tokens: 10, output_tokens: 2 }
	})

	it('reads upstream latency from Server-Timing, not the hop through our server', async () => {
		mockFetch(new Response(ok, { headers: { 'Server-Timing': 'upstream;dur=87' } }))
		const result = await callTypeSafe(
			{ model: 'jev-latest', state: 'x', questions: {} },
			KEY,
			undefined,
			JEV_PROXY_URL
		)
		expect(result.latencyMs).toBe(87)
	})

	it('parses the header and ignores a missing one', () => {
		expect(upstreamMs('upstream;dur=12.5')).toBe(12.5)
		expect(upstreamMs(null)).toBeNull()
		expect(upstreamMs('other;dur=1')).toBeNull()
	})
})

describe('fetchModels', () => {
	it('lists OpenRouter models with per-million prices, and no price for a router', async () => {
		mockFetch(
			new Response(
				JSON.stringify({
					data: [
						{ id: 'a/b', name: 'A: B', pricing: { prompt: '0.000003', completion: '0.000015' } },
						{ id: 'typesafe/jev-router', pricing: { prompt: '-1', completion: '-1' } }
					]
				})
			)
		)
		const models = await fetchModels(PROVIDERS.openrouter, KEY)
		expect(models.find((m) => m.id === 'a/b')).toMatchObject({ inputPerM: 3, outputPerM: 15 })
		expect(models.find((m) => m.id === 'typesafe/jev-router')?.inputPerM).toBeUndefined()
	})

	it('keeps only chat-capable OpenAI models', async () => {
		mockFetch(
			new Response(
				JSON.stringify({
					data: [{ id: 'gpt-5' }, { id: 'text-embedding-3-small' }, { id: 'whisper-1' }]
				})
			)
		)
		expect((await fetchModels(PROVIDERS.openai, KEY)).map((m) => m.id)).toEqual(['gpt-5'])
	})

	it('keeps only Gemini models that can generate content, with the key in a header', async () => {
		const fetchMock = mockFetch(
			new Response(
				JSON.stringify({
					models: [
						{ name: 'models/gemini-2.5-pro', supportedGenerationMethods: ['generateContent'] },
						{ name: 'models/embedding-001', supportedGenerationMethods: ['embedContent'] }
					]
				})
			)
		)
		const models = await fetchModels(PROVIDERS.google, KEY)
		expect(models.map((m) => m.id)).toEqual(['gemini-2.5-pro'])
		expect(String(fetchMock.mock.calls[0]?.[0])).not.toContain('key=')
		expect(new Headers(fetchMock.mock.calls[0]?.[1]?.headers).get('x-goog-api-key')).toBe(KEY)
	})

	it('lists Anthropic models with the browser-access header', async () => {
		const fetchMock = mockFetch(
			new Response(
				JSON.stringify({ data: [{ id: 'claude-opus-5-5', display_name: 'Claude Opus 5.5' }] })
			)
		)
		expect(await fetchModels(PROVIDERS.anthropic, KEY)).toEqual([
			{ id: 'claude-opus-5-5', label: 'Claude Opus 5.5' }
		])
		const headers = new Headers(fetchMock.mock.calls[0]?.[1]?.headers)
		expect(headers.get('anthropic-dangerous-direct-browser-access')).toBe('true')
		// The API returns 20 models a page by default; one page of up to 1000 covers them all.
		expect(new URL(String(fetchMock.mock.calls[0]?.[0])).searchParams.get('limit')).toBe('1000')
	})

	it('tests a TypeSafe key through /api/jev', async () => {
		const fetchMock = mockFetch(new Response('{"data":[]}'))
		expect(await fetchModels(PROVIDERS.typesafe, KEY)).toEqual([])
		expect(String(fetchMock.mock.calls[0]?.[0])).toBe(JEV_PROXY_URL)
	})
})
