import { beforeEach, describe, expect, it, vi } from 'vitest'

const USER_ID = '3f2a4c1e-0b7d-4e55-9a10-2c6f1d8e9b42'
const REDIRECT = 'NEXT_REDIRECT'

const state = vi.hoisted(() => ({
	deleteMany: vi.fn(),
	deleteAuthUser: vi.fn(),
	signOut: vi.fn(),
	signedIn: true,
	order: [] as string[]
}))

vi.mock('@/server/db/client', () => ({ db: { user: { deleteMany: state.deleteMany } } }))
vi.mock('@/lib/supabase/secret-key', () => ({
	createSecretKeyClient: () => ({ auth: { admin: { deleteUser: state.deleteAuthUser } } })
}))
vi.mock('@/lib/supabase/server', () => ({
	createServerSupabaseClient: async () => ({ auth: { signOut: state.signOut } })
}))
vi.mock('@/server/auth/session', () => ({
	requireUser: async () => {
		if (!state.signedIn) throw Object.assign(new Error('no session'), { status: 401 })
		return { userId: USER_ID, email: 'ada@example.com' }
	}
}))
vi.mock('next/navigation', () => ({
	redirect: (to: string) => {
		throw Object.assign(new Error(REDIRECT), { digest: `${REDIRECT};replace;${to};307;` })
	},
	unstable_rethrow: (error: unknown) => {
		if (error instanceof Error && error.message === REDIRECT) throw error
	}
}))
vi.mock('@/lib/observability/capture-error', () => ({
	captureError: (error: { userMessage?: string; status?: number }) => ({
		userMessage: error.userMessage ?? 'Something went wrong. Please try again.',
		status: error.status ?? 500
	})
}))

const { deleteAccount } = await import('./account')

function redirectTarget(error: unknown): string | undefined {
	return (error as { digest?: string }).digest?.split(';')[2]
}

beforeEach(() => {
	vi.clearAllMocks()
	state.signedIn = true
	state.order = []
	state.deleteMany.mockImplementation(async () => {
		state.order.push('db')
		return { count: 1 }
	})
	state.deleteAuthUser.mockImplementation(async () => {
		state.order.push('auth')
		return { error: null }
	})
	state.signOut.mockResolvedValue({ error: null })
})

describe('deleteAccount', () => {
	it('deletes only the signed-in user, rows first and then the auth account, and sends them to sign-in', async () => {
		const error = await deleteAccount(undefined).catch((e: unknown) => e)
		expect(state.deleteMany).toHaveBeenCalledWith({ where: { id: USER_ID } })
		expect(state.deleteAuthUser).toHaveBeenCalledWith(USER_ID)
		expect(state.order).toEqual(['db', 'auth'])
		expect(state.signOut).toHaveBeenCalled()
		expect(redirectTarget(error)).toBe('/sign-in')
	})

	it('ignores any input: a caller cannot name another user', async () => {
		await deleteAccount({ userId: 'someone-else' }).catch((e: unknown) => e)
		expect(state.deleteMany).toHaveBeenCalledWith({ where: { id: USER_ID } })
		expect(state.deleteAuthUser).not.toHaveBeenCalledWith('someone-else')
	})

	it('needs a session', async () => {
		state.signedIn = false
		const result = await deleteAccount(undefined)
		expect(result).toMatchObject({ ok: false })
		expect(state.deleteMany).not.toHaveBeenCalled()
		expect(state.deleteAuthUser).not.toHaveBeenCalled()
	})

	it('says so when the auth account could not be removed, so the user can retry', async () => {
		state.deleteAuthUser.mockResolvedValue({ error: { message: 'boom', status: 500 } })
		const result = await deleteAccount(undefined)
		expect(result).toMatchObject({ ok: false })
		expect(state.signOut).not.toHaveBeenCalled()
	})

	it('still signs out and redirects when the auth account is already gone', async () => {
		state.deleteAuthUser.mockResolvedValue({ error: { message: 'User not found', status: 404 } })
		const error = await deleteAccount(undefined).catch((e: unknown) => e)
		expect(redirectTarget(error)).toBe('/sign-in')
	})

	it('redirects even when clearing the session cookie fails, because the account is gone', async () => {
		state.signOut.mockResolvedValue({ error: { message: 'session missing' } })
		const error = await deleteAccount(undefined).catch((e: unknown) => e)
		expect(redirectTarget(error)).toBe('/sign-in')
	})
})
