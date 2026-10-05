'use client'

import { useRef } from 'react'
import { PRICES } from '@/content/prices'
import type { Task } from '@/content/task-schema'
import { useKeys } from '@/features/keys/keys-context'
import { LiveFailureAlert } from '@/features/race/live-failure-alert'
import { useLiveSetup } from '@/features/race/use-live-config'
import { useRecordDevRun } from '@/features/race/use-record-dev-run'
import { JEV_MODEL_ALIAS, PROVIDERS } from '@/lib/constants'
import { stopOnProviderFailure } from '@/runner/live'
import { jevRacer, type JevCall } from '@/runner/racers'
import { TrickWriter } from './trick-writer'
import { useLiveTrick, type TrickAttempt, type TrickInput } from './use-live-trick'

const NO_JEV_KEY = 'Add your TypeSafe key or an OpenRouter key, so Jev can answer your message.'

/**
 * Level 8 in Developer mode (R14): the user's own trick goes to Jev live,
 * through the same runner as the races (R92), scored against the answer the
 * user says is right. The attempts live in the level stepper, so Reveal shows them too.
 */
export function TrickLivePlay({
	task,
	question,
	attempts,
	onAttempt,
	onUseBeginner
}: {
	task: Task
	question: string
	attempts: TrickAttempt[]
	onAttempt: (attempt: TrickAttempt) => void
	onUseBeginner: () => void
}) {
	const setup = useLiveSetup()
	const { setPanelOpen } = useKeys()
	// The model that answered the call in flight (one at a time), for that attempt's label.
	const answered = useRef<string | null>(null)
	const trick = useLiveTrick({
		onAttempt: (run) => onAttempt({ ...run, modelId: answered.current ?? JEV_MODEL_ALIAS })
	})
	const devRun = useRecordDevRun()
	const jev = setup.jev

	function ask(input: TrickInput, jevCall: JevCall): void {
		answered.current = null
		const call: JevCall = async (body, signal) => {
			const result = await jevCall(body, signal)
			answered.current = result.modelId
			return result
		}
		const run = stopOnProviderFailure(jevRacer({ task, call, prices: PRICES }))
		trick.ask(input, async (item, signal) => {
			const result = await run(item, signal)
			devRun.record()
			return result
		})
	}

	return (
		<TrickWriter
			question={question}
			missing={jev ? null : NO_JEV_KEY}
			attempts={attempts}
			pending={trick.pending}
			onAsk={(input) => {
				if (jev) ask(input, jev.call)
			}}
			onOpenKeys={() => setPanelOpen(true)}
		>
			{jev && trick.failure && (
				<LiveFailureAlert
					failure={trick.failure}
					jevProvider={jev.provider}
					llmProvider={setup.provider ?? PROVIDERS.anthropic}
					onRetry={() => {
						if (trick.lastInput) ask(trick.lastInput, jev.call)
					}}
					onUseBeginner={onUseBeginner}
				/>
			)}
		</TrickWriter>
	)
}
