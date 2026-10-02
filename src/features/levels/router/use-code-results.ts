'use client'

import { useEffect, useState } from 'react'
import type { Task } from '@/content/task-schema'
import { codeRacer } from '@/runner/racers'
import type { ItemResult } from '@/runner/types'

/**
 * Runs the Code racer on the first item of every task that has a Code
 * function, through the shared runner (R92). Code is deterministic and costs
 * nothing, so it runs in the browser when the level opens.
 */
export function useCodeResults(tasks: Task[], enabled: boolean): Record<string, ItemResult> {
	const [results, setResults] = useState<Record<string, ItemResult>>({})
	useEffect(() => {
		if (!enabled) return
		const controller = new AbortController()
		const runs = tasks.flatMap((task) => {
			const item = task.items[0]
			if (!task.code || !item) return []
			return [codeRacer(task)(item, controller.signal).then((result) => [task.id, result] as const)]
		})
		void Promise.all(runs).then((entries) => {
			if (!controller.signal.aborted) setResults(Object.fromEntries(entries))
		})
		return () => controller.abort()
	}, [tasks, enabled])
	return results
}
