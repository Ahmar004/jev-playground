import { afterEach, describe, expect, it, vi } from 'vitest'
import { CLAUDE_MODELS, PROVIDER_ERROR_KINDS } from '@/lib/constants'
import { ProviderError } from './provider-error'
import { ANTHROPIC_URL, ANTHROPIC_VERSION, buildAnthropicBody, callAnthropic } from './anthropic'

const KEY = 'sk-ant-test-456'
const OK_BODY = JSON.stringify({
	model: 'claude-opus-5-5',
	content: [
		{ type: 'thinking', thinking: '' },
		{ type: 'text', text: '{"answer": ' },
		{ type: 'text', text: '"billing"}' }
	],
	usage: { input_tokens: 812, output_tokens: 240 },
	stop_reason: 'end_turn'
})

afterEach(() => vi.unstubAllGlobals())

describe('buildAnthropicBody', () => {
	it('sends one user message and runs Opus 5.5 at low effort', () => {
		const body = buildAnthropicBody(CLAUDE_MODELS.opus, 'prompt')
		expect(body.model).toBe(CLAUDE_MODELS.opus)
		expect(body.messages).toEqual([{ role: 'user', content: 'prompt' }])
		expect(body.output_config).toEqual({ effort: 'low' })
	})

	it('leaves Sonnet and Haiku at the provider defaults', () => {
		expect(buildAnthropicBody(CLAUDE_MODELS.sonnet, 'p').output_config).toBeUndefined()
		expect(buildAnthropicBody(CLAUDE_MODELS.haiku, 'p').output_config).toBeUndefined()
	})
})

describe('callAnthropic', () => {
	it('sends the key and version headers plus direct browser access', async () => {
		const fetchMock = vi.fn<typeof fetch>(async () => new Response(OK_BODY, { status: 200 }))
		vi.stubGlobal('fetch', fetchMock)
		await callAnthropic(buildAnthropicBody(CLAUDE_MODELS.opus, 'p'), KEY)
		const [url, init] = fetchMock.mock.calls[0] ?? []
		const headers = new Headers(init?.headers)
		expect(String(url)).toBe(ANTHROPIC_URL)
		expect(String(url)).not.toContain(KEY)
		expect(headers.get('x-api-key')).toBe(KEY)
		expect(headers.get('anthropic-version')).toBe(ANTHROPIC_VERSION)
		expect(headers.get('anthropic-dangerous-direct-browser-access')).toBe('true')
	})

	it('returns the joined text blocks, skipping thinking, with usage and model', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn(async () => new Response(OK_BODY, { status: 200 }))
		)
		const result = await callAnthropic(buildAnthropicBody(CLAUDE_MODELS.opus, 'p'), KEY)
		expect(result.text).toBe('{"answer": "billing"}')
		expect(result.usage).toEqual({ inputTokens: 812, outputTokens: 240 })
		expect(result.modelId).toBe('claude-opus-5-5')
	})

	it('maps an error status to a ProviderError without the key', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn(async () => new Response('{"type":"error"}', { status: 529 }))
		)
		const error = await callAnthropic(buildAnthropicBody(CLAUDE_MODELS.opus, 'p'), KEY).catch(
			(caught: unknown) => caught
		)
		expect(error).toBeInstanceOf(ProviderError)
		expect(error instanceof ProviderError && error.kind).toBe(PROVIDER_ERROR_KINDS.overloaded)
		expect(String(error)).not.toContain(KEY)
	})
})
