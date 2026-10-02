'use client'

import { useEffect, useRef, useState } from 'react'
import type { Recording } from '@/content/recording-schema'
import type { Task } from '@/content/task-schema'
import {
	RACE_STATUS,
	RACERS,
	RUN_EVENTS,
	type ProviderErrorKind,
	type Racer,
	type RaceStatus
} from '@/lib/constants'
import type { CombineArgs } from '@/runner/code/combine-fns'
import { createCombineTap } from '@/runner/combine'
import { ProviderError } from '@/runner/providers/provider-error'
import { replaySource, type ReplayHandle } from '@/runner/replay'
import { runItems } from '@/runner/run'
import type { ItemRunner, RunEvent, RunTotals } from '@/runner/types'
import { initialRaceState, raceRacers, raceReducer, type RaceState } from './race-state'

// How often the race clock refreshes while a race runs.
const CLOCK_TICK_MS = 100

export type RaceEntry = { racer: Recording['racer']; recording: Recording }

// Live calls in place of replays (Developer mode): one runner per racer, with the key bound.
export type LiveRace = { jev: ItemRunner; llm: ItemRunner }

// The run stopped on a failure that would repeat (a bad key, a rate limit, an outage).
export type RaceFailure = { kind: ProviderErrorKind; racer: Racer }

// Every racer's final totals, handed over when a run finishes (games record them).
export type RaceFinish = Partial<Record<Racer, RunTotals>>

export type RaceControls = {
	status: RaceStatus
	racers: Racer[]
	perRacer: RaceState
	elapsedMs: number
	// When a live run started (ISO), for its Developer mode label; null for replays.
	startedAt: string | null
	failure: RaceFailure | null
	start: () => void
	skip: () => void
	cancel: () => void
}

type ActiveRun = {
	controller: AbortController
	handles: Pick<ReplayHandle, 'skip' | 'done'>[]
	clock: ReturnType<typeof setInterval>
}

// Read in event handlers only; a named helper keeps the purity lint from reading start() as render code.
function currentTime(): number {
	return Date.now()
}

function stopRun(run: ActiveRun | null): void {
	if (!run) return
	run.controller.abort()
	clearInterval(run.clock)
}

/**
 * Plays a race from Recordings at their recorded speed (DESIGN 3.3, R7), or,
 * with `live`, from real provider calls. skip() jumps a replay to its totals;
 * a live run has nothing to skip, because results land as calls finish.
 */
export function useRace({
	task,
	entries,
	combineArgs,
	live,
	onFinished
}: {
	task: Task
	entries: RaceEntry[]
	live?: LiveRace
	// Level 5's slider weights, read when the race starts.
	combineArgs?: CombineArgs
	// Called once when every racer has finished, not when a live run stops on a failure.
	onFinished?: (finish: RaceFinish) => void
}): RaceControls {
	const racers = raceRacers(
		task,
		entries.map((entry) => entry.racer)
	)
	const itemsTotal = task.items.length
	const [perRacer, setPerRacer] = useState(() => initialRaceState(racers, itemsTotal))
	const [status, setStatus] = useState<RaceStatus>(RACE_STATUS.idle)
	const [elapsedMs, setElapsedMs] = useState(0)
	const [startedAt, setStartedAt] = useState<string | null>(null)
	const [failure, setFailure] = useState<RaceFailure | null>(null)
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
		const begunAt = currentTime()
		setPerRacer(initialRaceState(racers, itemsTotal))
		setElapsedMs(0)
		setStatus(RACE_STATUS.running)
		// One tap per run: it accumulates Jev + Code results for their totals.
		const finish: RaceFinish = {}
		const onEvent = createCombineTap(
			task,
			(event) => {
				if (event.type === RUN_EVENTS.runFinished) finish[event.racer] = event.totals
				setPerRacer((state) => raceReducer(state, event))
			},
			combineArgs
		)
		setFailure(null)
		setStartedAt(live ? new Date(currentTime()).toISOString() : null)
		const handles = live
			? startLive(task, live, onEvent, controller.signal)
			: replay(onEvent, controller.signal)
		const clock = setInterval(() => setElapsedMs(currentTime() - begunAt), CLOCK_TICK_MS)
		active.current.run = { controller, handles, clock }
		void Promise.all(handles.map((handle) => handle.done))
			.catch((error: unknown) => {
				// A live run that hit a repeating failure stops here; the results so far stay on screen.
				if (error instanceof LiveFailure) setFailure({ kind: error.kind, racer: error.racer })
				else throw error
			})
			.then(() => {
				if (controller.signal.aborted) return
				clearInterval(clock)
				setElapsedMs(currentTime() - begunAt)
				active.current.run = null
				setStatus(RACE_STATUS.finished)
				onFinished?.(finish)
			})
	}

	function replay(onEvent: (event: RunEvent) => void, signal: AbortSignal) {
		return entries.map(({ recording }) => replaySource(recording, { onEvent, signal }))
	}

	function skip(): void {
		for (const handle of active.current.run?.handles ?? []) handle.skip()
	}

	function cancel(): void {
		stopRun(active.current.run)
		active.current.run = null
		setPerRacer(initialRaceState(racers, itemsTotal))
		setElapsedMs(0)
		setStartedAt(null)
		setFailure(null)
		setStatus(RACE_STATUS.idle)
	}

	return { status, racers, perRacer, elapsedMs, startedAt, failure, start, skip, cancel }
}

// Carries which racer's calls stopped a live run, out of the lane that threw.
class LiveFailure extends Error {
	constructor(
		readonly kind: ProviderErrorKind,
		readonly racer: Racer
	) {
		super(`Live run stopped: ${kind}`)
	}
}

/** Runs Jev and the LLM together over their own lanes; one stopping failure aborts both. */
function startLive(
	task: Task,
	live: LiveRace,
	onEvent: (event: RunEvent) => void,
	signal: AbortSignal
): Pick<ReplayHandle, 'skip' | 'done'>[] {
	const stop = new AbortController()
	const onAbort = () => stop.abort()
	signal.addEventListener('abort', onAbort, { once: true })
	const lane = (racer: typeof RACERS.jev | typeof RACERS.llm, runner: ItemRunner) => ({
		skip: () => {},
		done: runItems(task, racer, runner, { onEvent, signal: stop.signal })
			.then(() => undefined)
			.catch((error: unknown) => {
				stop.abort()
				throw error instanceof ProviderError ? new LiveFailure(error.kind, racer) : error
			})
	})
	return [lane(RACERS.jev, live.jev), lane(RACERS.llm, live.llm)]
}
