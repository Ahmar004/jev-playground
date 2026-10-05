'use server'

import { redirect } from 'next/navigation'
import { z } from 'zod'
import { createSecretKeyClient } from '@/lib/supabase/secret-key'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { ROUTES } from '@/lib/links'
import { requireUser } from '@/server/auth/session'
import { db } from '@/server/db/client'
import { validatedAction } from './validated-action'

const HTTP_NOT_FOUND = 404

/**
 * Deletes the signed-in user's account (ROADMAP Step-21): the User row, whose
 * foreign keys cascade to progress, check answers, quiz attempts, XP, badges,
 * leaderboard entries and shares, then the Supabase Auth user. The id is the
 * session's; no input is read, so nobody can name another account. Rows go
 * first: if the auth step fails the user can retry, and nothing of theirs is
 * left behind. A deleted-but-still-valid token is cleared by signing out.
 */
export const deleteAccount = validatedAction({
	input: z.unknown(),
	handler: async (): Promise<never> => {
		const { userId } = await requireUser()
		await db.user.deleteMany({ where: { id: userId } })
		const { error } = await createSecretKeyClient().auth.admin.deleteUser(userId)
		if (error && error.status !== HTTP_NOT_FOUND) {
			throw new Error(`Supabase could not delete the auth user: ${error.message}`)
		}
		const supabase = await createServerSupabaseClient()
		// The cookie is the only thing left; a failure here must not stop the redirect.
		await supabase.auth.signOut()
		redirect(ROUTES.signIn)
	}
})
