'use client'

import { useMutation } from '@tanstack/react-query'
import { useState } from 'react'
import { LEVEL_STATUS, type LevelStatus } from '@/lib/constants'
import { isStaleDeployError } from '@/lib/errors/stale-deploy'
import { toast } from '@/lib/toast'
import { useServerState } from '@/lib/use-server-state'
import { setLevelStatus } from '@/server/actions/progress'

/** Skips a level with an optimistic status that rolls back, with a toast either way. */
export function useSkipLevel(initial: Record<string, LevelStatus>) {
	const [statuses, setStatuses] = useServerState(initial)
	const [pendingLevelId, setPendingLevelId] = useState<string | null>(null)

	const mutation = useMutation({
		mutationFn: async (levelId: string) => {
			const result = await setLevelStatus({ levelId, status: LEVEL_STATUS.skipped })
			if (!result.ok) throw new Error(result.error)
		},
		onMutate: (levelId) => {
			setPendingLevelId(levelId)
			const previous = statuses
			setStatuses((current) => ({ ...current, [levelId]: LEVEL_STATUS.skipped }))
			return previous
		},
		onError: (error, _levelId, previous) => {
			if (previous) setStatuses(previous)
			if (isStaleDeployError(error)) return
			toast({
				title: "Couldn't skip the level",
				description: error instanceof Error ? error.message : 'Try again in a moment.',
				variant: 'destructive'
			})
		},
		onSuccess: () => toast({ title: 'Level skipped', description: 'You can revisit it any time.' }),
		onSettled: () => setPendingLevelId(null)
	})

	return {
		statuses,
		pendingLevelId,
		skip: (levelId: string) => {
			if (mutation.isPending) return
			mutation.mutate(levelId)
		}
	}
}
