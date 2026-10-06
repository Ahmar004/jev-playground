import { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const getClaims = vi.fn()
const createServerClient = vi.fn<
	(url: string, key: string, options: unknown) => { auth: { getClaims: typeof getClaims } }
>(() => ({
	auth: { getClaims }
}))

vi.mock('server-only', () => ({}))
vi.mock('@supabase/ssr', () => ({ createServerClient }))

const { default: proxy, config } = await import('./proxy')
const { unstable_doesMiddlewareMatch: matches } = await import('next/experimental/testing/server')

beforeEach(() => {
	createServerClient.mockClear()
	getClaims.mockResolvedValue({ data: { claims: { sub: 'user-1' } } })
	vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://example.supabase.co')
	vi.stubEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', 'sb_publishable_abc')
	vi.stubEnv('SUPABASE_SECRET_KEY', 'sb_secret_xyz')
})

function request(forwardedFor?: string): NextRequest {
	return new NextRequest('https://app.example.com/games', {
		headers: forwardedFor ? { 'x-forwarded-for': forwardedFor } : {}
	})
}

function lastCall(): { key: string; headers: unknown } {
	const [, key, options] = createServerClient.mock.calls.at(-1) ?? []
	return {
		key: key ?? '',
		headers: (options as { global?: { headers?: unknown } }).global?.headers
	}
}

describe('proxy', () => {
	it("refreshes the session with the visitor's IP, so Supabase limits each visitor on their own", async () => {
		await proxy(request('198.51.100.4'))

		expect(lastCall()).toEqual({
			key: 'sb_secret_xyz',
			headers: { 'sb-forwarded-for': '198.51.100.4' }
		})
	})

	it('uses the publishable key when the platform gives no visitor IP', async () => {
		await proxy(request())

		expect(lastCall()).toEqual({ key: 'sb_publishable_abc', headers: {} })
	})

	it('still lets a signed-in visitor through and sends a signed-out one to sign-in', async () => {
		expect((await proxy(request('198.51.100.4'))).headers.get('location')).toBeNull()

		getClaims.mockResolvedValue({ data: null })
		const redirect = await proxy(request('198.51.100.4'))
		expect(new URL(redirect.headers.get('location') ?? '').pathname).toBe('/sign-in')
	})

	it('runs for page loads and navigations but not for router prefetches', () => {
		const url = 'https://app.example.com/games'
		expect(matches({ config, url })).toBe(true)
		// A client-side navigation is an RSC request: it must still refresh and gate.
		expect(matches({ config, url, headers: { rsc: '1' } })).toBe(true)
		// A prefetch only carries the static shell, so skipping it costs no auth
		// check; each one would otherwise be its own function call on Vercel.
		expect(matches({ config, url, headers: { rsc: '1', 'next-router-prefetch': '1' } })).toBe(false)
		expect(matches({ config, url, headers: { purpose: 'prefetch' } })).toBe(false)
	})

	it('skips API routes, static files and Next internals', () => {
		for (const path of ['/api/jev', '/_next/static/chunks/a.js', '/icon.svg', '/robots.txt']) {
			expect(matches({ config, url: `https://app.example.com${path}` })).toBe(false)
		}
	})
})
