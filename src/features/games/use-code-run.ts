'use client'

import { useEffect, useState } from 'react'
import type { Task } from '@/content/task-schema'
import { RACERS, RUN_EVENTS } from '@/lib/constants'
import { codeRacer } from '@/runner/racers'
import { runItems } from '@/runner/run'
import type { RunTotals } from '@/runner/types'

/**
 * The Code racer's result for a game, through the shared runner (R92). Code is
 * deterministic and free, so it runs in the browser once the race is over.
 */
export function useCodeRun(task: Task, enabled: boolean): RunTotals | null {
	const [totals, setTotals] = useState<RunTotals | null>(null)
	useEffect(() => {
		if (!enabled || !task.code) return
		const controller = new AbortController()
		void runItems(task, RACERS.code, codeRacer(task), {
			signal: controller.signal,
			onEvent: (event) => {
				if (event.type === RUN_EVENTS.runFinished) setTotals(event.totals)
			}
		})
		return () => controller.abort()
	}, [task, enabled])
	return enabled ? totals : null
}
