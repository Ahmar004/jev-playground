'use client'

import { useTransition } from 'react'
import { toast } from '@/lib/toast'
import { signOut } from '@/server/actions/auth'

// A successful sign-out redirects on the server; only a failure returns.
export function useSignOut() {
	const [pending, startTransition] = useTransition()

	function run() {
		startTransition(async () => {
			const result = await signOut(undefined)
			if (!result.ok)
				toast({ title: 'Could not sign out', description: result.error, variant: 'destructive' })
		})
	}

	return { pending, signOut: run }
}
