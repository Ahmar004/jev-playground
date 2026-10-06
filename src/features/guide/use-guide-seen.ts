'use client'

import { useMutation } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import type { GuidePart } from '@/lib/constants'
import { ROUTES } from '@/lib/links'
import { isStaleDeployError } from '@/lib/errors/stale-deploy'
import { toast } from '@/lib/toast'
import { useServerState } from '@/lib/use-server-state'
import { markGuideSeen, resetGuide } from '@/server/actions/guide'
import { mergeGuideSeen } from './guide'

/**
 * The guide parts this user has seen, saved per account. Marking is
 * optimistic and is not rolled back on failure: putting a dismissed pop-up
 * back would block the page again, so a failed save only means it may show
 * once more on the next visit, and a toast says so.
 */
export function useGuideSeen(serverSeen: GuidePart[]) {
	const [seen, setSeen] = useServerState(serverSeen)
	const mutation = useMutation({
		mutationFn: async (parts: GuidePart[]) => {
			const result = await markGuideSeen({ parts })
			if (!result.ok) throw new Error(result.error)
		},
		onMutate: (parts) => setSeen((current) => mergeGuideSeen(current, parts)),
		onError: (error) => {
			if (isStaleDeployError(error)) return
			toast({
				title: "Couldn't save your guide progress",
				description: 'The guide may show again on your next visit.',
				variant: 'destructive'
			})
		}
	})
	return { seen, markSeen: mutation.mutate }
}

/** "Take the tour" in the account menu: empties the saved list, then opens Home, where the tour starts. */
export function useReplayGuide() {
	const router = useRouter()
	const mutation = useMutation({
		mutationFn: async () => {
			const result = await resetGuide(undefined)
			if (!result.ok) throw new Error(result.error)
		},
		onSuccess: () => {
			toast({ title: 'Tour restarted', description: 'The level tips will show again too.' })
			router.push(ROUTES.home)
		},
		onError: (error) => {
			if (isStaleDeployError(error)) return
			toast({
				title: "Couldn't restart the tour",
				description: error instanceof Error ? error.message : 'Try again in a moment.',
				variant: 'destructive'
			})
		}
	})
	return { replay: () => mutation.mutate(), pending: mutation.isPending }
}
