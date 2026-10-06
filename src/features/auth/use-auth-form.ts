'use client'

import { unstable_rethrow } from 'next/navigation'
import { useState, useTransition } from 'react'
import { handleStaleDeploy } from '@/lib/errors/stale-deploy'
import { toast } from '@/lib/toast'
import type { ActionResult } from '@/server/actions/validated-action'

export const NETWORK_ERROR_MESSAGE =
	'Could not reach the server. Check your connection and try again.'

const HTTP_TOO_MANY_REQUESTS = 429

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
				if (!result.ok) {
					setError(result.error)
					// A rate limit is not a typo to fix: say it where the eye already is.
					if (result.status === HTTP_TOO_MANY_REQUESTS) {
						toast({
							title: 'Slow down a little',
							description: result.error,
							variant: 'destructive'
						})
					}
				}
			} catch (thrown) {
				// A redirect can arrive as a thrown error and must keep going.
				unstable_rethrow(thrown)
				if (handleStaleDeploy(thrown)) return
				setError(NETWORK_ERROR_MESSAGE)
			}
		})
	}

	return { submit, pending, error }
}
