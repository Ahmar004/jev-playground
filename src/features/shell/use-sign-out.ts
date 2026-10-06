'use client'

import { unstable_rethrow } from 'next/navigation'
import { useTransition } from 'react'
import { NETWORK_ERROR_MESSAGE } from '@/features/auth/use-auth-form'
import { handleStaleDeploy } from '@/lib/errors/stale-deploy'
import { toast } from '@/lib/toast'
import { signOut } from '@/server/actions/auth'

function showFailure(description: string) {
	toast({ title: 'Could not sign out', description, variant: 'destructive' })
}

// A successful sign-out redirects on the server; only a failure returns.
export function useSignOut() {
	const [pending, startTransition] = useTransition()

	function run() {
		startTransition(async () => {
			try {
				const result = await signOut(undefined)
				if (!result.ok) showFailure(result.error)
			} catch (thrown) {
				// A redirect can arrive as a thrown error and must keep going.
				unstable_rethrow(thrown)
				if (handleStaleDeploy(thrown)) return
				showFailure(NETWORK_ERROR_MESSAGE)
			}
		})
	}

	return { pending, signOut: run }
}
