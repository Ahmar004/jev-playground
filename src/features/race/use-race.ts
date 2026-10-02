'use client'

import { useEffect, useRef, useState } from 'react'
import type { Recording } from '@/content/recording-schema'
import type { Task } from '@/content/task-schema'
import { RACE_STATUS, type Racer, type RaceStatus } from '@/lib/constants'
import type { CombineArgs } from '@/runner/code/combine-fns'
import { createCombineTap } from '@/runner/combine'
import { replaySource, type ReplayHandle } from '@/runner/replay'
import { initialRaceState, raceRacers, raceReducer, type RaceState } from './race-state'

// How often the race clock refreshes while a race runs.
const CLOCK_TICK_MS = 100

export type RaceEntry = { racer: Recording['racer']; recording: Recording }

export type RaceControls = {
	status: RaceStatus
	racers: Racer[]
	perRacer: RaceState
	elapsedMs: number
	start: () => void
	skip: () => void
	cancel: () => void
}

type ActiveRun = {
	controller: AbortController
	handles: ReplayHandle[]
	clock: ReturnType<typeof setInterval>
}

function stopRun(run: ActiveRun | null): void {
	if (!run) return
	run.controller.abort()
	clearInterval(run.clock)
}

/**
 * Plays a race from Recordings at their recorded speed (DESIGN 3.3, R7).
 * skip() jumps to the recorded totals. Slice 8 adds the live source.
 */
export function useRace({
	task,
	entries,
	combineArgs
}: {
	task: Task
	entries: RaceEntry[]
	// Level 5's slider weights, read when the race starts.
	combineArgs?: CombineArgs
}): RaceControls {
	const racers = raceRacers(
		task,
		entries.map((entry) => entry.racer)
	)
	const itemsTotal = task.items.length
	const [perRacer, setPerRacer] = useState(() => initialRaceState(racers, itemsTotal))
	const [status, setStatus] = useState<RaceStatus>(RACE_STATUS.idle)
	const [elapsedMs, setElapsedMs] = useState(0)
	// A stable box, so the unmount cleanup sees the run that is live then.
	const active = useRef<{ run: ActiveRun | null }>({ run: null })

	useEffect(() => {
		const box = active.current
		return () => {
			stopRun(box.run)
			box.run = null
		}
	}, [])

	function start(): void {
		if (active.current.run) return
		const controller = new AbortController()
		const startedAt = Date.now()
		setPerRacer(initialRaceState(racers, itemsTotal))
		setElapsedMs(0)
		setStatus(RACE_STATUS.running)
		// One tap per run: it accumulates Jev + Code results for their totals.
		const onEvent = createCombineTap(
			task,
			(event) => setPerRacer((state) => raceReducer(state, event)),
			combineArgs
		)
		const handles = entries.map(({ recording }) =>
			replaySource(recording, { onEvent, signal: controller.signal })
		)
		const clock = setInterval(() => setElapsedMs(Date.now() - startedAt), CLOCK_TICK_MS)
		active.current.run = { controller, handles, clock }
		void Promise.all(handles.map((handle) => handle.done)).then(() => {
			if (controller.signal.aborted) return
			clearInterval(clock)
			setElapsedMs(Date.now() - startedAt)
			active.current.run = null
			setStatus(RACE_STATUS.finished)
		})
	}

	function skip(): void {
		for (const handle of active.current.run?.handles ?? []) handle.skip()
	}

	function cancel(): void {
		stopRun(active.current.run)
		active.current.run = null
		setPerRacer(initialRaceState(racers, itemsTotal))
		setElapsedMs(0)
		setStatus(RACE_STATUS.idle)
	}

	return { status, racers, perRacer, elapsedMs, start, skip, cancel }
}
