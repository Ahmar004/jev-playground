'use client'

import type { Recording } from '@/content/recording-schema'
import type { Task } from '@/content/task-schema'
import { MODES, RACE_LANES, RACERS, type Mode, type Racer } from '@/lib/constants'
import type { RunTotals } from '@/runner/types'
import type { CombineArgs } from '@/runner/code/combine-fns'
import { liveModelId, liveRunners, type LiveConfig } from './live-config'
import { LiveFailureAlert } from './live-failure-alert'
import { RaceView, type RaceTrackData } from './race-view'
import type { RaceState } from './race-state'
import { useRace, type RaceFinish } from './use-race'
import { useRecordDevRun } from './use-record-dev-run'

// One racer's final totals with its mode label: `recordedAt` is the recording date, or a live run's start.
export type RaceResult = {
	racer: Racer
	modelId: string
	recordedAt: string
	mode: Mode
	totals: RunTotals
}

/**
 * Each racer's result, labelled with where it came from: the recording's
 * model and date, or the live call's answering model and run start. Jev + Code
 * (a combine task) carries Jev's.
 */
export function raceResults(
	finish: RaceFinish,
	jev: Recording,
	opponent: Recording,
	live: LiveConfig | undefined,
	startedAt: string | null
): RaceResult[] {
	const racers: Racer[] = [RACERS.jev, RACERS.jevCode, RACERS.llm]
	return racers.flatMap((racer): RaceResult[] => {
		const totals = finish[racer]
		if (!totals) return []
		if (live) {
			const modelId = liveModelId(live, racer)
			return [{ racer, modelId, recordedAt: startedAt ?? '', mode: MODES.developer, totals }]
		}
		const source = racer === RACERS.llm ? opponent : jev
		const { modelId, recordedAt } = source
		return [{ racer, modelId, recordedAt, mode: MODES.beginner, totals }]
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
	// The racers' final totals with their labels, once the race finishes.
	onFinished?: (results: RaceResult[]) => void
}) {
	const recordings = [jev, opponent]
	const devRun = useRecordDevRun()
	const race = useRace({
		task,
		entries: recordings.map((recording) => ({ racer: recording.racer, recording })),
		combineArgs,
		live: live ? liveRunners(task, live) : undefined,
		onFinished: (finish, startedAt) => {
			if (live) devRun.record()
			onFinished?.(raceResults(finish, jev, opponent, live, startedAt))
		}
	})
	// Jev + Code (a combine task) shows Jev's model and recording date.
	const tracks: RaceTrackData[] = race.racers.flatMap((racer) => {
		const state = race.perRacer[racer]
		if (!state) return []
		if (live) {
			return [
				{
					racer,
					modelId: liveModelId(live, racer),
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
				<LiveFailureAlert
					failure={race.failure}
					jevProvider={live.jevProvider}
					llmProvider={live.llmProvider}
					onRetry={race.start}
					onUseBeginner={onUseBeginner}
				/>
			)}
		</div>
	)
}
