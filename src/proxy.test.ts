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

const { default: proxy } = await import('./proxy')

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
})
