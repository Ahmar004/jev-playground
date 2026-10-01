'use server'

import { redirect } from 'next/navigation'
import { z } from 'zod'
import { PASSWORD_MIN_LENGTH } from '@/lib/constants'
import { AppError } from '@/lib/errors/app-error'
import { ROUTES } from '@/lib/links'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { provisionUser } from '@/server/auth/provision-user'
import { validatedAction } from './validated-action'

const email = z.string().trim().toLowerCase().email()

// Sign-up enforces the minimum; sign-in accepts any existing password.
const signUpCredentials = z.object({ email, password: z.string().min(PASSWORD_MIN_LENGTH) })
const signInCredentials = z.object({ email, password: z.string().min(1) })

type AuthFailure = { code?: string; message: string }

// Supabase error codes mapped to plain-English messages (spec 11). Anything
// unmapped is a real fault and goes to Sentry through captureError.
const KNOWN_FAILURES: Record<string, { message: string; status: number }> = {
	invalid_credentials: { message: 'That email and password do not match an account.', status: 401 },
	user_already_exists: {
		message: 'An account with this email already exists. Sign in instead.',
		status: 409
	},
	email_exists: {
		message: 'An account with this email already exists. Sign in instead.',
		status: 409
	},
	weak_password: { message: 'Choose a stronger password.', status: 422 },
	over_request_rate_limit: {
		message: 'Too many attempts. Wait a minute and try again.',
		status: 429
	},
	over_email_send_rate_limit: {
		message: 'Too many attempts. Wait a minute and try again.',
		status: 429
	},
	email_address_invalid: { message: 'Enter a valid email address.', status: 422 }
}

function toAppError(failure: AuthFailure): Error {
	const known = failure.code ? KNOWN_FAILURES[failure.code] : undefined
	if (known) return new AppError(known.message, { status: known.status, code: failure.code })
	return new Error(`Supabase auth failed: ${failure.code ?? 'unknown'} ${failure.message}`)
}

export const signIn = validatedAction({
	input: signInCredentials,
	handler: async (input): Promise<never> => {
		const supabase = await createServerSupabaseClient()
		const { data, error } = await supabase.auth.signInWithPassword(input)
		if (error || !data.user?.email) throw toAppError(error ?? { message: 'no user returned' })
		await provisionUser({ id: data.user.id, email: data.user.email })
		redirect(ROUTES.home)
	}
})

export const signUp = validatedAction({
	input: signUpCredentials,
	handler: async (input): Promise<never> => {
		const supabase = await createServerSupabaseClient()
		const { data, error } = await supabase.auth.signUp(input)
		if (error || !data.user?.email) throw toAppError(error ?? { message: 'no user returned' })
		await provisionUser({ id: data.user.id, email: data.user.email })
		redirect(ROUTES.home)
	}
})

export const signOut = validatedAction({
	input: z.undefined(),
	handler: async (): Promise<never> => {
		const supabase = await createServerSupabaseClient()
		const { error } = await supabase.auth.signOut()
		if (error) throw toAppError(error)
		redirect(ROUTES.signIn)
	}
})
