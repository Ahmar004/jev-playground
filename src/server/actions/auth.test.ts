import { beforeEach, describe, expect, it, vi } from 'vitest'
import { RATE_LIMITS } from '@/lib/constants'
import { AppError } from '@/lib/errors/app-error'

const auth = {
	signInWithPassword: vi.fn(),
	signUp: vi.fn(),
	signOut: vi.fn()
}
const provisionUser = vi.fn()
const limits = vi.hoisted(() => ({ assert: vi.fn(), ip: null as string | null }))
const REDIRECT = 'NEXT_REDIRECT'

vi.mock('@/lib/supabase/server', () => ({
	createServerSupabaseClient: async () => ({ auth })
}))
vi.mock('@/server/auth/provision-user', () => ({ provisionUser }))
vi.mock('@/server/lib/rate-limit', () => ({ assertWithinLimit: limits.assert }))
vi.mock('next/headers', () => ({
	headers: async () => new Headers(limits.ip ? { 'x-forwarded-for': limits.ip } : {})
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

const { signIn, signOut, signUp } = await import('./auth')

const USER = { id: '3f2a4c1e-0b7d-4e55-9a10-2c6f1d8e9b42', email: 'ada@example.com' }
const GOOD = { email: 'ada@example.com', password: 'correct-horse-9' }

function redirectTarget(error: unknown): string | undefined {
	return (error as { digest?: string }).digest?.split(';')[2]
}

beforeEach(() => {
	vi.clearAllMocks()
	limits.assert.mockResolvedValue(undefined)
	limits.ip = null
})

const TOO_MANY = new AppError('Too many attempts. Wait 40 seconds and try again.', { status: 429 })

describe('signIn', () => {
	it('provisions the user and redirects Home', async () => {
		auth.signInWithPassword.mockResolvedValue({ data: { user: USER }, error: null })

		const error = await signIn(GOOD).catch((e: unknown) => e)

		expect(auth.signInWithPassword).toHaveBeenCalledWith(GOOD)
		expect(provisionUser).toHaveBeenCalledWith({ id: USER.id, email: USER.email })
		expect(redirectTarget(error)).toBe('/')
	})

	it('trims and lowercases the email before calling Supabase', async () => {
		auth.signInWithPassword.mockResolvedValue({ data: { user: USER }, error: null })

		await signIn({ email: '  Ada@Example.COM ', password: 'correct-horse-9' }).catch(
			(e: unknown) => e
		)

		expect(auth.signInWithPassword).toHaveBeenCalledWith({
			email: 'ada@example.com',
			password: 'correct-horse-9'
		})
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

	it('does not enforce the sign-up minimum on sign-in', async () => {
		auth.signInWithPassword.mockResolvedValue({ data: { user: USER }, error: null })

		await signIn({ email: 'ada@example.com', password: 'short' }).catch((e: unknown) => e)

		expect(auth.signInWithPassword).toHaveBeenCalledWith({
			email: 'ada@example.com',
			password: 'short'
		})
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

describe('signUp failures', () => {
	it('says when the email is invalid', async () => {
		auth.signUp.mockResolvedValue({
			data: { user: null, session: null },
			error: { code: 'email_address_invalid', message: 'Email address is invalid' }
		})

		const result = await signUp(GOOD)

		expect(result).toEqual({ ok: false, error: 'Enter a valid email address.', status: 422 })
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

describe('rate limits (Step-19)', () => {
	it('limits sign-in per email, and per IP when the IP is known', async () => {
		limits.ip = '203.0.113.7'
		auth.signInWithPassword.mockResolvedValue({ data: { user: USER }, error: null })
		await signIn({ email: '  Ada@Example.COM ', password: 'correct-horse-9' }).catch(
			(e: unknown) => e
		)
		expect(limits.assert).toHaveBeenCalledWith(RATE_LIMITS.signInPerEmail, 'ada@example.com')
		expect(limits.assert).toHaveBeenCalledWith(RATE_LIMITS.signInPerIp, '203.0.113.7')
	})

	it('does not limit by IP when there is none, as on localhost', async () => {
		auth.signInWithPassword.mockResolvedValue({ data: { user: USER }, error: null })
		await signIn(GOOD).catch((e: unknown) => e)
		expect(limits.assert).toHaveBeenCalledTimes(1)
	})

	it('stops a limited sign-in before Supabase, with the wait in the message', async () => {
		limits.assert.mockRejectedValue(TOO_MANY)
		const result = await signIn(GOOD)
		expect(result).toEqual({
			ok: false,
			error: 'Too many attempts. Wait 40 seconds and try again.',
			status: 429
		})
		expect(auth.signInWithPassword).not.toHaveBeenCalled()
	})

	it('limits sign-up per IP, and stops a limited one before Supabase', async () => {
		limits.ip = '203.0.113.7'
		auth.signUp.mockResolvedValue({ data: { user: USER }, error: null })
		await signUp(GOOD).catch((e: unknown) => e)
		expect(limits.assert).toHaveBeenCalledWith(RATE_LIMITS.signUpPerIp, '203.0.113.7')
		limits.assert.mockRejectedValue(TOO_MANY)
		expect(await signUp(GOOD)).toMatchObject({ ok: false, status: 429 })
		expect(auth.signUp).toHaveBeenCalledTimes(1)
	})

	it('does not limit sign-up when the IP is unknown', async () => {
		auth.signUp.mockResolvedValue({ data: { user: USER }, error: null })
		await signUp(GOOD).catch((e: unknown) => e)
		expect(limits.assert).not.toHaveBeenCalled()
	})
})
