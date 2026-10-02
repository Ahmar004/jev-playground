'use client'

import { useMutation } from '@tanstack/react-query'
import { submitFirstPlay } from '@/server/actions/progress'
import type { FirstPlay } from '@/server/progress/first-play'
import { announceAwards } from './awards-toast'

/**
 * Sends a level game's first try (level 6's sort) so the server can award
 * right_tool. The server keeps only the first one, so later tries send nothing.
 */
export function useFirstPlay(levelId: string) {
	const mutation = useMutation({
		mutationFn: async (play: FirstPlay) => {
			const result = await submitFirstPlay({ levelId, play })
			if (!result.ok) throw new Error(result.error)
			return result.data
		},
		// A badge attempt that fails costs the user nothing they can see, so it stays quiet.
		onSuccess: (data) => announceAwards(data.awards)
	})
	return { submit: mutation.mutate }
}
