'use client'

import { unstable_rethrow } from 'next/navigation'
import { useTransition } from 'react'
import { handleStaleDeploy } from '@/lib/errors/stale-deploy'
import { toast } from '@/lib/toast'
import { deleteAccount } from '@/server/actions/account'

export const NETWORK_ERROR_MESSAGE =
	'Could not reach the server. Check your connection and try again.'

/**
 * Deletes the signed-in account. A successful delete redirects to sign-in on the
 * server, so the promise only resolves for a failure, which is what this toasts.
 */
export function useDeleteAccount() {
	const [pending, startTransition] = useTransition()

	function remove() {
		startTransition(async () => {
			try {
				const result = await deleteAccount(undefined)
				if (!result.ok) {
					toast({
						title: "Couldn't delete your account",
						description: result.error,
						variant: 'destructive'
					})
				}
			} catch (thrown) {
				// The redirect after a successful delete arrives as a thrown error and must keep going.
				unstable_rethrow(thrown)
				if (handleStaleDeploy(thrown)) return
				toast({
					title: "Couldn't delete your account",
					description: NETWORK_ERROR_MESSAGE,
					variant: 'destructive'
				})
			}
		})
	}

	return { remove, pending }
}
