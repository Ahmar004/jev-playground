import 'server-only'
import { cache } from 'react'
import { AppError } from '@/lib/errors/app-error'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export type Session = { userId: string; email: string }

const UNAUTHORIZED = 401

// The one session object for every signed-in UI decision (CLAUDE.md >
// Architecture). getClaims() verifies the JWT locally against the project's
// signing keys. cache() dedupes it within one request.
export const getSession = cache(async (): Promise<Session | null> => {
	const supabase = await createServerSupabaseClient()
	const { data, error } = await supabase.auth.getClaims()
	if (error || !data) return null
	const { sub, email } = data.claims
	if (typeof sub !== 'string' || typeof email !== 'string') return null
	return { userId: sub, email }
})

// Every Server Action except signIn and signUp calls this first (DESIGN 11.3).
export async function requireUser(): Promise<Session> {
	const session = await getSession()
	if (!session) {
		throw new AppError('Please sign in to continue.', {
			status: UNAUTHORIZED,
			code: 'unauthenticated'
		})
	}
	return session
}
