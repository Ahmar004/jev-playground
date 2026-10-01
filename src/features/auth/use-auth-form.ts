'use client'

import { unstable_rethrow } from 'next/navigation'
import { useState, useTransition } from 'react'
import type { ActionResult } from '@/server/actions/validated-action'

export const NETWORK_ERROR_MESSAGE =
	'Could not reach the server. Check your connection and try again.'

export type Credentials = { email: string; password: string }

// A successful sign-in or sign-up redirects on the server, so the promise only
// resolves for a failure; that failure is what this hook surfaces.
export function useAuthForm(action: (input: Credentials) => Promise<ActionResult<never>>) {
	const [pending, startTransition] = useTransition()
	const [error, setError] = useState<string | null>(null)

	function submit(values: Credentials) {
		setError(null)
		startTransition(async () => {
			try {
				const result = await action(values)
				if (!result.ok) setError(result.error)
			} catch (thrown) {
				// A redirect can arrive as a thrown error and must keep going.
				unstable_rethrow(thrown)
				setError(NETWORK_ERROR_MESSAGE)
			}
		})
	}

	return { submit, pending, error }
}
