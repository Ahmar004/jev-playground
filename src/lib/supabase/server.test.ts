import { beforeEach, describe, expect, it, vi } from 'vitest'

const state = vi.hoisted(() => ({ forwardedFor: null as string | null }))
const createServerClient = vi.fn<(url: string, key: string, options: unknown) => { auth: object }>(
	() => ({ auth: {} })
)

vi.mock('server-only', () => ({}))
vi.mock('@supabase/ssr', () => ({ createServerClient }))
vi.mock('next/headers', () => ({
	cookies: async () => ({ getAll: () => [], set: () => undefined }),
	headers: async () =>
		new Headers(state.forwardedFor ? { 'x-forwarded-for': state.forwardedFor } : {})
}))

const { createServerSupabaseClient } = await import('./server')

beforeEach(() => {
	createServerClient.mockClear()
	state.forwardedFor = null
	vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://example.supabase.co')
	vi.stubEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', 'sb_publishable_abc')
	vi.stubEnv('SUPABASE_SECRET_KEY', 'sb_secret_xyz')
})

function lastCall(): { key: string; headers: unknown } {
	const [, key, options] = createServerClient.mock.calls.at(-1) ?? []
	return {
		key: key ?? '',
		headers: (options as { global?: { headers?: unknown } }).global?.headers
	}
}

describe('createServerSupabaseClient', () => {
	it("forwards the visitor's IP to Supabase Auth (sign-in, sign-up, sign-out)", async () => {
		state.forwardedFor = '203.0.113.7, 10.0.0.1'

		await createServerSupabaseClient()

		expect(lastCall()).toEqual({
			key: 'sb_secret_xyz',
			headers: { 'sb-forwarded-for': '203.0.113.7' }
		})
	})

	it('falls back to the publishable key on this machine, where there is no visitor IP', async () => {
		state.forwardedFor = '::1'

		await createServerSupabaseClient()

		expect(lastCall()).toEqual({ key: 'sb_publishable_abc', headers: {} })
	})
})
