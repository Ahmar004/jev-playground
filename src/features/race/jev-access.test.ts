import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Keys } from '@/features/keys/keys-context'
import { OPENROUTER_JEV_MODEL, PROVIDERS } from '@/lib/constants'
import { OPENROUTER_JEV_URL } from '@/runner/providers/openrouter-jev'
import { JEV_PROXY_URL } from '@/runner/providers/typesafe'
import type { JevRequestBody } from '@/runner/types'
import { jevAccessFor } from './jev-access'

const BODY: JevRequestBody = { model: 'jev-latest', state: 'x', questions: {} }
const ANSWER = JSON.stringify({
	model: 'jev-1.13.0',
	answers: {},
	usage: { input_tokens: 10, output_tokens: 2 }
})

const entry = (key: string) => ({ key, keyId: `id-${key}` })

function mockFetch() {
	const fetchMock = vi.fn<typeof fetch>(async () => new Response(ANSWER))
	vi.stubGlobal('fetch', fetchMock)
	return fetchMock
}

afterEach(() => vi.unstubAllGlobals())

describe('jevAccessFor', () => {
	it('has no access without a TypeSafe or an OpenRouter key', () => {
		expect(jevAccessFor({})).toBeNull()
		const others: Keys = { [PROVIDERS.anthropic]: entry('a'), [PROVIDERS.openai]: entry('o') }
		expect(jevAccessFor(others)).toBeNull()
	})

	it('sends a TypeSafe key through our pass-through', async () => {
		const fetchMock = mockFetch()
		const access = jevAccessFor({ [PROVIDERS.typesafe]: entry('ts-key') })
		expect(access?.provider).toBe(PROVIDERS.typesafe)
		await access?.call(BODY, new AbortController().signal)
		expect(String(fetchMock.mock.calls[0]?.[0])).toBe(JEV_PROXY_URL)
		expect(new Headers(fetchMock.mock.calls[0]?.[1]?.headers).get('authorization')).toBe(
			'Bearer ts-key'
		)
	})

	it('sends an OpenRouter key straight to OpenRouter with its model id', async () => {
		const fetchMock = mockFetch()
		const access = jevAccessFor({ [PROVIDERS.openrouter]: entry('or-key') })
		expect(access?.provider).toBe(PROVIDERS.openrouter)
		await access?.call(BODY, new AbortController().signal)
		expect(String(fetchMock.mock.calls[0]?.[0])).toBe(OPENROUTER_JEV_URL)
		expect(JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body)).model).toBe(OPENROUTER_JEV_MODEL)
	})

	it('prefers the TypeSafe key when both are set', () => {
		const access = jevAccessFor({
			[PROVIDERS.typesafe]: entry('ts-key'),
			[PROVIDERS.openrouter]: entry('or-key')
		})
		expect(access?.provider).toBe(PROVIDERS.typesafe)
	})
})
