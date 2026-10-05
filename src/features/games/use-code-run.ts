'use client'

import { useEffect, useState } from 'react'
import type { Task } from '@/content/task-schema'
import { RACERS, RUN_EVENTS } from '@/lib/constants'
import { codeRacer } from '@/runner/racers'
import { runItems } from '@/runner/run'
import type { ItemResult, RunTotals } from '@/runner/types'

export type CodeRun = { totals: RunTotals; results: ItemResult[] }

/**
 * The Code racer's result for a game, through the shared runner (R92): its totals and
 * its answer per item. Code is deterministic and free, so it runs in the browser once
 * the race is over.
 */
export function useCodeRun(task: Task, enabled: boolean): CodeRun | null {
	const [run, setRun] = useState<CodeRun | null>(null)
	useEffect(() => {
		if (!enabled || !task.code) return
		const controller = new AbortController()
		const results: ItemResult[] = []
		void runItems(task, RACERS.code, codeRacer(task), {
			signal: controller.signal,
			onEvent: (event) => {
				if (event.type === RUN_EVENTS.itemFinished) results.push(event.result)
				if (event.type === RUN_EVENTS.runFinished) setRun({ totals: event.totals, results })
			}
		})
		return () => controller.abort()
	}, [task, enabled])
	return enabled ? run : null
}
