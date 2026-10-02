'use client'

import { useEffect, useRef, useState } from 'react'
import type { Task } from '@/content/task-schema'
import type { LiveConfig } from '@/features/race/live-config'
import {
	PROVIDER_ERROR_KINDS,
	RACERS,
	RUN_STOPPING_ERRORS,
	type ProviderErrorKind,
	type Racer
} from '@/lib/constants'
import { jevRacer, llmRacer } from '@/runner/racers'
import type { ItemResult } from '@/runner/types'

export type LiveRunStatus = 'idle' | 'running' | 'done'
export type LiveFailure = { racer: Racer; kind: ProviderErrorKind }

/**
 * Developer mode's single live run: Jev and the LLM answer the one item at
 * once, through the same racers the recording CLI uses (R92). A failure that
 * would repeat (bad key, rate limit, outage) is reported with its racer so
 * the view can offer Retry; any other result, even a rejection, is shown.
 */
export function useArenaLive(config: LiveConfig) {
	const [status, setStatus] = useState<LiveRunStatus>('idle')
	const [results, setResults] = useState<Partial<Record<Racer, ItemResult>>>({})
	const [failure, setFailure] = useState<LiveFailure | null>(null)
	// What the latest run was started with: the task as it was then, and when.
	const [ran, setRan] = useState<{ task: Task; startedAt: string } | null>(null)
	const controller = useRef<AbortController | null>(null)

	useEffect(() => () => controller.current?.abort(), [])

	const run = (task: Task) => {
		controller.current?.abort()
		const abort = new AbortController()
		controller.current = abort
		const item = task.items[0]
		if (!item) return
		setResults({})
		setFailure(null)
		setRan({ task, startedAt: new Date().toISOString() })
		setStatus('running')
		const runners: [Racer, Promise<ItemResult>][] = [
			[
				RACERS.jev,
				jevRacer({ task, call: config.jevCall, prices: config.prices })(item, abort.signal)
			],
			[
				RACERS.llm,
				llmRacer({
					task,
					modelId: config.llmModelId,
					call: config.llmCall,
					prices: config.prices
				})(item, abort.signal)
			]
		]
		void Promise.all(
			runners.map(async ([racer, pending]) => {
				const result = await pending
				if (abort.signal.aborted) return
				if (result.error && RUN_STOPPING_ERRORS.includes(result.error)) {
					setFailure(
						(current) => current ?? { racer, kind: result.error ?? PROVIDER_ERROR_KINDS.unknown }
					)
					return
				}
				setResults((current) => ({ ...current, [racer]: result }))
			})
		).then(() => {
			if (!abort.signal.aborted) setStatus('done')
		})
	}

	return { status, results, failure, ran, run }
}
