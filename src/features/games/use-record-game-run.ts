'use client'

import { useMutation } from '@tanstack/react-query'
import { announceAwards } from '@/features/levels/awards-toast'
import { isStaleDeployError } from '@/lib/errors/stale-deploy'
import { toast } from '@/lib/toast'
import { recordGameRun } from '@/server/actions/games'
import type { GameRunInput } from './game-run'

/** Saves a finished timed game to the Leaderboard and announces any XP or badge it earned. */
export function useRecordGameRun() {
	const mutation = useMutation({
		mutationFn: async (input: GameRunInput) => {
			const result = await recordGameRun(input)
			if (!result.ok) throw new Error(result.error)
			return result.data
		},
		onSuccess: (data) => {
			announceAwards(data.awards)
			toast({ title: 'Saved to your Leaderboard' })
		},
		onError: (error: unknown) => {
			if (isStaleDeployError(error)) return
			toast({
				title: "Couldn't save this run",
				description: error instanceof Error ? error.message : 'Try again in a moment.',
				variant: 'destructive'
			})
		}
	})
	return { record: mutation.mutate }
}
