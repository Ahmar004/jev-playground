'use client'

import { PRICES } from '@/content/prices'
import type { Task } from '@/content/task-schema'
import { useKeys } from '@/features/keys/keys-context'
import { LiveFailureAlert } from '@/features/race/live-failure-alert'
import { useLiveSetup } from '@/features/race/use-live-config'
import { useRecordDevRun } from '@/features/race/use-record-dev-run'
import { PROVIDERS } from '@/lib/constants'
import { stopOnProviderFailure } from '@/runner/live'
import { jevRacer, type JevCall } from '@/runner/racers'
import { TrickWriter } from './trick-writer'
import { useLiveTrick, type TrickInput } from './use-live-trick'

const NO_JEV_KEY = 'Add your TypeSafe key, so Jev can answer your message.'

/**
 * Level 8 in Developer mode (R14): the user's own trick goes to Jev live,
 * through the same runner as the races (R92), scored against the answer the
 * user says is right.
 */
export function TrickLivePlay({
	task,
	question,
	onUseBeginner
}: {
	task: Task
	question: string
	onUseBeginner: () => void
}) {
	const setup = useLiveSetup()
	const { setPanelOpen } = useKeys()
	const trick = useLiveTrick()
	const devRun = useRecordDevRun()
	const jev = setup.jev

	function ask(input: TrickInput, call: JevCall): void {
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
			attempts={trick.attempts}
			pending={trick.pending}
			modelId={jev?.modelId ?? ''}
			onAsk={(input) => {
				if (jev) ask(input, jev.call)
			}}
			onOpenKeys={() => setPanelOpen(true)}
		>
			{jev && trick.failure && (
				<LiveFailureAlert
					failure={trick.failure}
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
