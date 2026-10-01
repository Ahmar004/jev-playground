'use client'

import { useState, useTransition } from 'react'
import type { ActionResult } from '@/server/actions/validated-action'

export type Credentials = { email: string; password: string }

// A successful sign-in or sign-up redirects on the server, so the promise only
// resolves for a failure; that failure is what this hook surfaces.
export function useAuthForm(action: (input: Credentials) => Promise<ActionResult<never>>) {
	const [pending, startTransition] = useTransition()
	const [error, setError] = useState<string | null>(null)

	function submit(values: Credentials) {
		setError(null)
		startTransition(async () => {
			const result = await action(values)
			if (!result.ok) setError(result.error)
		})
	}

	return { submit, pending, error }
}
