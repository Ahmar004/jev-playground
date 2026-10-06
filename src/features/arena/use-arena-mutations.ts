'use client'

import { useMutation } from '@tanstack/react-query'
import { announceAwards } from '@/features/levels/awards-toast'
import { ANALYTICS_EVENTS } from '@/lib/analytics/events'
import { track } from '@/lib/analytics/track'
import { MODES } from '@/lib/constants'
import { isStaleDeployError } from '@/lib/errors/stale-deploy'
import { toast } from '@/lib/toast'
import { recordArenaRun } from '@/server/actions/arena'
import { createShare, deleteShare } from '@/server/actions/share'
import type { ArenaSnapshot } from './snapshot'

export type ShareRequest =
	| { mode: typeof MODES.beginner; presetId: string; opponentModelId: string }
	| { mode: typeof MODES.developer; snapshot: ArenaSnapshot }

/** Saves a finished Beginner preset replay, which earns XP once per preset. */
export function useRecordArenaRun() {
	const mutation = useMutation({
		mutationFn: async (presetId: string) => {
			const result = await recordArenaRun({ presetId })
			if (!result.ok) throw new Error(result.error)
			return result.data
		},
		onSuccess: (data) => announceAwards(data.awards)
	})
	return { record: mutation.mutate }
}

/**
 * Creates a share and returns its id. `consent` is sent with a Developer
 * share, which the server checks when the snapshot holds the user's own text.
 */
export function useCreateShare(onCreated: (shareId: string) => void) {
	const mutation = useMutation({
		mutationFn: async ({ request, consent }: { request: ShareRequest; consent: boolean }) => {
			const result = await createShare(
				request.mode === MODES.beginner ? request : { ...request, consent }
			)
			if (!result.ok) throw new Error(result.error)
			return { request, data: result.data }
		},
		onSuccess: ({ request, data }) => {
			track(ANALYTICS_EVENTS.SHARE_CREATED, {
				mode: request.mode,
				...(request.mode === MODES.beginner
					? { preset_id: request.presetId }
					: request.snapshot.presetId
						? { preset_id: request.snapshot.presetId }
						: {})
			})
			announceAwards({ xp: 0, badges: data.badges })
			onCreated(data.id)
		},
		onError: (error: unknown) => {
			if (isStaleDeployError(error)) return
			toast({
				title: "Couldn't create the link",
				description: error instanceof Error ? error.message : 'Try again in a moment.',
				variant: 'destructive'
			})
		}
	})
	return { create: mutation.mutate, pending: mutation.isPending }
}

/** Deletes one of the user's shares; its link stops working at once (R87). */
export function useDeleteShare(onDeleted: (shareId: string) => void) {
	const mutation = useMutation({
		mutationFn: async (shareId: string) => {
			const result = await deleteShare({ shareId })
			if (!result.ok) throw new Error(result.error)
			return shareId
		},
		onSuccess: (shareId) => {
			onDeleted(shareId)
			toast({ title: 'Share deleted', description: 'Its link no longer works.' })
		},
		onError: (error: unknown) => {
			if (isStaleDeployError(error)) return
			toast({
				title: "Couldn't delete the share",
				description: error instanceof Error ? error.message : 'Try again in a moment.',
				variant: 'destructive'
			})
		}
	})
	return { remove: mutation.mutate, pending: mutation.isPending }
}
