'use client'

import { useEffect, useRef, useState } from 'react'
import { PRICES } from '@/content/prices'
import type { Task } from '@/content/task-schema'
import type { ArenaSide } from '@/features/arena/snapshot'
import { useRecordDevRun } from '@/features/race/use-record-dev-run'
import {
	JEV_MODEL_ALIAS,
	PROVIDER_ERROR_KINDS,
	RACERS,
	RUN_STOPPING_ERRORS,
	type ProviderErrorKind
} from '@/lib/constants'
import type { JevAccess } from '@/features/race/jev-access'
import { jevRacer } from '@/runner/racers'

export type SandboxRunStatus = 'idle' | 'running' | 'done'

/**
 * Developer mode's run: one call to Jev with the user's TypeSafe or OpenRouter
 * key, through the same racer the recording CLI uses (R92). A failure that would
 * repeat (bad key, rate limit, outage) is reported for Retry; any other result,
 * even a rejection of the request, is shown as Jev answered it.
 */
export function useSandboxRun(jev: JevAccess | null) {
	const [status, setStatus] = useState<SandboxRunStatus>('idle')
	const [side, setSide] = useState<ArenaSide | null>(null)
	const [failure, setFailure] = useState<ProviderErrorKind | null>(null)
	const controller = useRef<AbortController | null>(null)
	const devRun = useRecordDevRun()

	useEffect(() => () => controller.current?.abort(), [])

	const run = (task: Task) => {
		const item = task.items[0]
		if (!jev || !item) return
		controller.current?.abort()
		const abort = new AbortController()
		controller.current = abort
		setSide(null)
		setFailure(null)
		setStatus('running')
		const startedAt = new Date().toISOString()
		let answeredBy = JEV_MODEL_ALIAS
		const racer = jevRacer({
			task,
			prices: PRICES,
			call: async (body, signal) => {
				const result = await jev.call(body, signal)
				answeredBy = result.modelId
				return result
			}
		})
		void racer(item, abort.signal).then((result) => {
			if (abort.signal.aborted) return
			if (result.error && RUN_STOPPING_ERRORS.includes(result.error)) {
				setFailure(result.error)
			} else {
				setSide({ racer: RACERS.jev, modelId: answeredBy, at: startedAt, result })
				devRun.record()
			}
			setStatus('done')
		})
	}

	return {
		status,
		side,
		failure,
		run,
		malformed: side?.result.error === PROVIDER_ERROR_KINDS.malformed
	}
}
