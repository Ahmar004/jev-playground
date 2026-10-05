import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const state = vi.hoisted(() => ({ signedIn: true }))
vi.mock('@/server/auth/session', () => ({
	getSession: async () => (state.signedIn ? { userId: 'u1', email: 'ada@example.com' } : null)
}))
const logged = vi.hoisted(() => ({ lines: [] as unknown[] }))
vi.mock('@/server/lib/logger', () => ({
	log: {
		info: (...args: unknown[]) => logged.lines.push(args),
		warn: (...args: unknown[]) => logged.lines.push(args)
	}
}))

import { GET, POST } from './route'

const KEY = 'ts-secret-key-987'
const BODY = JSON.stringify({ model: 'jev-latest', state: 'secret ticket text', questions: {} })

function request(init: { method: string; auth?: string | null; body?: string }): Request {
	const headers: Record<string, string> = {}
	if (init.auth !== null) headers.authorization = init.auth ?? `Bearer ${KEY}`
	return new Request('http://localhost:3000/api/jev', {
		method: init.method,
		headers,
		body: init.body
	})
}

beforeEach(() => {
	state.signedIn = true
	logged.lines = []
})
afterEach(() => vi.unstubAllGlobals())

describe('/api/jev', () => {
	it('refuses a signed-out caller, so it is not an open proxy', async () => {
		state.signedIn = false
		const fetchMock = vi.fn()
		vi.stubGlobal('fetch', fetchMock)
		const response = await POST(request({ method: 'POST', body: BODY }))
		expect(response.status).toBe(401)
		expect(fetchMock).not.toHaveBeenCalled()
	})

	it('needs the key in the Authorization header', async () => {
		const response = await POST(request({ method: 'POST', body: BODY, auth: null }))
		expect(response.status).toBe(400)
	})

	it('forwards to the fixed TypeSafe URL with the key and returns status, body and timing', async () => {
		const fetchMock = vi.fn<typeof fetch>(async () => new Response('{"ok":1}', { status: 200 }))
		vi.stubGlobal('fetch', fetchMock)
		const response = await POST(request({ method: 'POST', body: BODY }))
		const [url, init] = fetchMock.mock.calls[0] ?? []
		expect(String(url)).toBe('https://api.typesafe.ai/v1/systemone')
		expect(new Headers(init?.headers).get('authorization')).toBe(`Bearer ${KEY}`)
		expect(init?.body).toBe(BODY)
		expect(response.status).toBe(200)
		expect(await response.text()).toBe('{"ok":1}')
		expect(response.headers.get('server-timing')).toMatch(/^upstream;dur=\d+$/)
	})

	it('passes TypeSafe errors through unchanged', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn(async () => new Response('{"error":"nope"}', { status: 429 }))
		)
		const response = await POST(request({ method: 'POST', body: BODY }))
		expect(response.status).toBe(429)
	})

	it('answers GET with a model-list call for the Test button', async () => {
		const fetchMock = vi.fn<typeof fetch>(async () => new Response('{"data":[]}', { status: 200 }))
		vi.stubGlobal('fetch', fetchMock)
		await GET(request({ method: 'GET' }))
		expect(String(fetchMock.mock.calls[0]?.[0])).toBe('https://api.typesafe.ai/v1/models')
	})

	it('rejects a body over 256 KB', async () => {
		const fetchMock = vi.fn()
		vi.stubGlobal('fetch', fetchMock)
		const response = await POST(request({ method: 'POST', body: 'x'.repeat(256 * 1024 + 1) }))
		expect(response.status).toBe(413)
		expect(fetchMock).not.toHaveBeenCalled()
	})

	it('answers 502 when TypeSafe cannot be reached', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn(async () => {
				throw new TypeError('fetch failed')
			})
		)
		const response = await POST(request({ method: 'POST', body: BODY }))
		expect(response.status).toBe(502)
	})

	it('gives up on a TypeSafe call that never answers with a 504', async () => {
		const fetchMock = vi.fn<typeof fetch>(async () => {
			throw new DOMException('The operation timed out.', 'TimeoutError')
		})
		vi.stubGlobal('fetch', fetchMock)
		const response = await POST(request({ method: 'POST', body: BODY }))
		expect(fetchMock.mock.calls[0]?.[1]?.signal).toBeInstanceOf(AbortSignal)
		expect(response.status).toBe(504)
	})

	it('logs neither the key nor the body (R18)', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn(async () => new Response('{}', { status: 200 }))
		)
		await POST(request({ method: 'POST', body: BODY }))
		const text = JSON.stringify(logged.lines)
		expect(text).not.toContain(KEY)
		expect(text).not.toContain('secret ticket text')
		expect(text).toContain('200')
	})
})
