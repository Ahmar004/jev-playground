import { beforeEach, describe, expect, it, vi } from 'vitest'

const auth = {
	signInWithPassword: vi.fn(),
	signUp: vi.fn(),
	signOut: vi.fn()
}
const provisionUser = vi.fn()
const REDIRECT = 'NEXT_REDIRECT'

vi.mock('@/lib/supabase/server', () => ({
	createServerSupabaseClient: async () => ({ auth })
}))
vi.mock('@/server/auth/provision-user', () => ({ provisionUser }))
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

const { signIn, signOut, signUp } = await import('./auth')

const USER = { id: '3f2a4c1e-0b7d-4e55-9a10-2c6f1d8e9b42', email: 'ada@example.com' }
const GOOD = { email: 'ada@example.com', password: 'correct-horse-9' }

function redirectTarget(error: unknown): string | undefined {
	return (error as { digest?: string }).digest?.split(';')[2]
}

beforeEach(() => {
	vi.clearAllMocks()
})

describe('signIn', () => {
	it('provisions the user and redirects Home', async () => {
		auth.signInWithPassword.mockResolvedValue({ data: { user: USER }, error: null })

		const error = await signIn(GOOD).catch((e: unknown) => e)

		expect(auth.signInWithPassword).toHaveBeenCalledWith(GOOD)
		expect(provisionUser).toHaveBeenCalledWith({ id: USER.id, email: USER.email })
		expect(redirectTarget(error)).toBe('/')
	})

	it('explains wrong credentials in plain English', async () => {
		auth.signInWithPassword.mockResolvedValue({
			data: { user: null },
			error: { code: 'invalid_credentials', message: 'Invalid login credentials' }
		})

		const result = await signIn(GOOD)

		expect(result).toEqual({
			ok: false,
			error: 'That email and password do not match an account.',
			status: 401
		})
		expect(provisionUser).not.toHaveBeenCalled()
	})

	it('rejects a malformed email before calling Supabase', async () => {
		const result = await signIn({ email: 'not-an-email', password: 'correct-horse-9' })

		expect(result).toMatchObject({ ok: false, status: 400 })
		expect(auth.signInWithPassword).not.toHaveBeenCalled()
	})
})

describe('signUp', () => {
	it('creates the account, provisions the user and redirects Home', async () => {
		auth.signUp.mockResolvedValue({ data: { user: USER, session: {} }, error: null })

		const error = await signUp(GOOD).catch((e: unknown) => e)

		expect(auth.signUp).toHaveBeenCalledWith(GOOD)
		expect(provisionUser).toHaveBeenCalledWith({ id: USER.id, email: USER.email })
		expect(redirectTarget(error)).toBe('/')
	})

	it('rejects a password shorter than 8 characters', async () => {
		const result = await signUp({ email: 'ada@example.com', password: 'short' })

		expect(result).toMatchObject({ ok: false, status: 400 })
		expect(auth.signUp).not.toHaveBeenCalled()
	})

	it('says when the email already has an account', async () => {
		auth.signUp.mockResolvedValue({
			data: { user: null, session: null },
			error: { code: 'user_already_exists', message: 'User already registered' }
		})

		const result = await signUp(GOOD)

		expect(result).toEqual({
			ok: false,
			error: 'An account with this email already exists. Sign in instead.',
			status: 409
		})
	})

	it('says when Supabase rate-limits sign-ups', async () => {
		auth.signUp.mockResolvedValue({
			data: { user: null, session: null },
			error: { code: 'over_request_rate_limit', message: 'Request rate limit reached' }
		})

		const result = await signUp(GOOD)

		expect(result).toEqual({
			ok: false,
			error: 'Too many attempts. Wait a minute and try again.',
			status: 429
		})
	})
})

describe('signOut', () => {
	it('signs out and redirects to sign-in', async () => {
		auth.signOut.mockResolvedValue({ error: null })

		const error = await signOut(undefined).catch((e: unknown) => e)

		expect(auth.signOut).toHaveBeenCalled()
		expect(redirectTarget(error)).toBe('/sign-in')
	})
})
