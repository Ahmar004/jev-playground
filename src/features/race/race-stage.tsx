'use client'

import type { Recording } from '@/content/recording-schema'
import type { Task } from '@/content/task-schema'
import { RACE_LANES, RACERS } from '@/lib/constants'
import type { CombineArgs } from '@/runner/code/combine-fns'
import { RaceView, type RaceTrackData } from './race-view'
import { useRace } from './use-race'

/**
 * Jev against one recorded opponent. Remount it with a new `key` to switch
 * opponents: unmounting aborts the old replay.
 */
export function RaceStage({
	task,
	jev,
	opponent,
	combineArgs
}: {
	task: Task
	jev: Recording
	opponent: Recording
	combineArgs?: CombineArgs
}) {
	const recordings = [jev, opponent]
	const race = useRace({
		task,
		entries: recordings.map((recording) => ({ racer: recording.racer, recording })),
		combineArgs
	})
	// Jev + Code (a combine task) shows Jev's model and recording date.
	const tracks: RaceTrackData[] = race.racers.flatMap((racer) => {
		const state = race.perRacer[racer]
		const source = racer === RACERS.llm ? opponent : jev
		return state ? [{ racer, modelId: source.modelId, recordedAt: source.recordedAt, state }] : []
	})
	return (
		<RaceView
			tracks={tracks}
			status={race.status}
			elapsedMs={race.elapsedMs}
			lanes={RACE_LANES}
			onStart={race.start}
			onSkip={race.skip}
		/>
	)
}
