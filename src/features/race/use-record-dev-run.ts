'use client'

import { useMutation } from '@tanstack/react-query'
import { useRef } from 'react'
import { announceAwards } from '@/features/levels/awards-toast'
import { recordDevRun } from '@/server/actions/progress'

/**
 * Reports a finished Developer mode live run, which pays 50 XP and the
 * live_wire badge the first time ever (DESIGN 10). Sent once per page visit;
 * the server ignores every run after the first.
 */
export function useRecordDevRun() {
	const sent = useRef(false)
	const mutation = useMutation({
		mutationFn: async () => {
			const result = await recordDevRun({})
			if (!result.ok) throw new Error(result.error)
			return result.data
		},
		// Only a reward rides on it, so a failure stays quiet; the next live run retries.
		onError: () => {
			sent.current = false
		},
		onSuccess: (data) => announceAwards(data.awards)
	})
	return {
		record: () => {
			if (sent.current) return
			sent.current = true
			mutation.mutate()
		}
	}
}
