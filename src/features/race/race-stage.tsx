'use client'

import { Button } from '@/components/ui/button'
import { AlertIcon } from '@/components/ui/icons'
import type { Recording } from '@/content/recording-schema'
import type { Task } from '@/content/task-schema'
import { providerErrorMessage } from '@/features/keys/error-copy'
import { JEV_MODEL_ALIAS, MODES, PROVIDERS, RACE_LANES, RACERS, type Racer } from '@/lib/constants'
import type { RunTotals } from '@/runner/types'
import type { CombineArgs } from '@/runner/code/combine-fns'
import { stopOnProviderFailure } from '@/runner/live'
import { jevRacer, llmRacer } from '@/runner/racers'
import type { LiveConfig } from './live-config'
import { RaceView, type RaceTrackData } from './race-view'
import type { RaceState } from './race-state'
import { useRace, type LiveRace, type RaceFinish } from './use-race'

function liveRunners(task: Task, live: LiveConfig): LiveRace {
	return {
		jev: stopOnProviderFailure(jevRacer({ task, call: live.jevCall, prices: live.prices })),
		llm: stopOnProviderFailure(
			llmRacer({ task, modelId: live.llmModelId, call: live.llmCall, prices: live.prices })
		)
	}
}

export type RaceResult = { racer: Racer; modelId: string; totals: RunTotals }

// The model that answered each racer: the recording's, or the live call's.
function raceResults(
	finish: RaceFinish,
	jev: Recording,
	opponent: Recording,
	live: LiveConfig | undefined
): RaceResult[] {
	const jevId = live ? (live.answered.jev ?? JEV_MODEL_ALIAS) : jev.modelId
	const llmId = live ? (live.answered.llm ?? live.llmModelId) : opponent.modelId
	const pairs: [Racer, string][] = [
		[RACERS.jev, jevId],
		[RACERS.llm, llmId]
	]
	return pairs.flatMap(([racer, modelId]) => {
		const totals = finish[racer]
		return totals ? [{ racer, modelId, totals }] : []
	})
}

/**
 * Jev against one opponent: a recorded one (Beginner mode) or a live one with
 * the user's keys (Developer mode, `live`). Remount it with a new `key` to
 * switch opponents: unmounting aborts the old run.
 */
export function RaceStage({
	task,
	jev,
	opponent,
	combineArgs,
	live,
	onUseBeginner,
	scene,
	onFinished
}: {
	task: Task
	jev: Recording
	opponent: Recording
	combineArgs?: CombineArgs
	live?: LiveConfig
	// Offered when a live run fails: the same race from the recordings (R81).
	onUseBeginner?: () => void
	// A game's animation, drawn from the race's live state above the tracks.
	scene?: (perRacer: RaceState) => React.ReactNode
	// The racers' final totals with their model ids, once the race finishes.
	onFinished?: (results: RaceResult[]) => void
}) {
	const recordings = [jev, opponent]
	const race = useRace({
		task,
		entries: recordings.map((recording) => ({ racer: recording.racer, recording })),
		combineArgs,
		live: live ? liveRunners(task, live) : undefined,
		onFinished: (finish) => onFinished?.(raceResults(finish, jev, opponent, live))
	})
	// Jev + Code (a combine task) shows Jev's model and recording date.
	const tracks: RaceTrackData[] = race.racers.flatMap((racer) => {
		const state = race.perRacer[racer]
		if (!state) return []
		if (live) {
			const modelId =
				racer === RACERS.llm
					? (live.answered.llm ?? live.llmModelId)
					: (live.answered.jev ?? JEV_MODEL_ALIAS)
			return [
				{
					racer,
					modelId,
					recordedAt: race.startedAt ?? '',
					mode: MODES.developer,
					state
				}
			]
		}
		const source = racer === RACERS.llm ? opponent : jev
		return [{ racer, modelId: source.modelId, recordedAt: source.recordedAt, state }]
	})
	const calls = task.items.length
	return (
		<div className="flex flex-col gap-3">
			{scene?.(race.perRacer)}
			<RaceView
				tracks={tracks}
				status={race.status}
				elapsedMs={race.elapsedMs}
				lanes={RACE_LANES}
				onStart={race.start}
				onSkip={race.skip}
				mode={live ? MODES.developer : MODES.beginner}
				idleNote={
					live
						? `Jev makes ${calls} calls and the LLM makes ${calls}, ${RACE_LANES} at a time.`
						: undefined
				}
			/>
			{race.failure && live && (
				<div
					role="alert"
					className="bg-surface border-danger text-text shadow-card flex flex-col gap-3 rounded-lg border p-4"
				>
					<p className="flex items-start gap-2">
						<AlertIcon className="text-danger mt-0.5 shrink-0" />
						<span>
							{providerErrorMessage(
								race.failure.kind,
								race.failure.racer === RACERS.llm ? live.llmProvider : PROVIDERS.typesafe
							)}{' '}
							The run stopped, and the results so far are kept above.
						</span>
					</p>
					<div className="flex flex-wrap gap-2">
						<Button type="button" size="sm" onClick={race.start}>
							Retry
						</Button>
						{onUseBeginner && (
							<Button type="button" size="sm" variant="outline" onClick={onUseBeginner}>
								Use Beginner mode instead
							</Button>
						)}
					</div>
				</div>
			)}
		</div>
	)
}
