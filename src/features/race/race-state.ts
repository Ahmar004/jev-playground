import type { Task } from '@/content/task-schema'
import { RACERS, RUN_EVENTS, type Racer } from '@/lib/constants'
import { computeTotals } from '@/runner/totals'
import type { ItemResult, RunEvent, RunTotals } from '@/runner/types'

export type RacerState = {
	racer: Racer
	itemsTotal: number
	// Calls started and not yet finished: one per busy lane.
	inFlight: number
	results: ItemResult[]
	// The runner's totals over the results so far, for the live counters.
	progress: RunTotals
	// The final totals from the run_finished event; null until then.
	totals: RunTotals | null
}

export type RaceState = Partial<Record<Racer, RacerState>>

/** The racers a race shows, with Jev + Code right after Jev when the task combines (DESIGN 3.2). */
export function raceRacers(task: Task, racers: readonly Racer[]): Racer[] {
	return racers.flatMap((racer) =>
		racer === RACERS.jev && task.combine ? [racer, RACERS.jevCode] : [racer]
	)
}

export function initialRaceState(racers: readonly Racer[], itemsTotal: number): RaceState {
	const state: RaceState = {}
	for (const racer of racers) {
		state[racer] = {
			racer,
			itemsTotal,
			inFlight: 0,
			results: [],
			progress: computeTotals([], 0),
			totals: null
		}
	}
	return state
}

/** Folds one RunEvent into the race. Live numbers come from the runner's computeTotals (R92). */
export function raceReducer(state: RaceState, event: RunEvent): RaceState {
	const current = state[event.racer]
	if (!current) return state
	switch (event.type) {
		case RUN_EVENTS.itemStarted:
			return { ...state, [event.racer]: { ...current, inFlight: current.inFlight + 1 } }
		case RUN_EVENTS.itemFinished: {
			const results = [...current.results, event.result]
			return {
				...state,
				[event.racer]: {
					...current,
					inFlight: Math.max(0, current.inFlight - 1),
					results,
					progress: computeTotals(results, event.atMs)
				}
			}
		}
		case RUN_EVENTS.runFinished:
			return { ...state, [event.racer]: { ...current, inFlight: 0, totals: event.totals } }
	}
}

/** A racer's clock: the race clock while it runs, its recorded wall time once it finishes. */
export function racerTimeMs(racer: RacerState, elapsedMs: number): number {
	return racer.totals ? racer.totals.wallMs : elapsedMs
}
