import { describe, expect, it } from 'vitest'
import { choiceTask, countTask } from '@/runner/testing/tasks'
import { jevRecording } from './testing/recordings'
import { initialRaceState, raceRacers, raceReducer, racerTimeMs } from './race-state'

const [first] = jevRecording.events
if (!first) throw new Error('fixture has no events')
const { lane, startMs, endMs, ...result } = first

describe('raceRacers', () => {
	it('keeps the racers as given when the task has no combine', () => {
		expect(raceRacers(choiceTask, ['jev', 'llm'])).toEqual(['jev', 'llm'])
	})

	it('adds Jev + Code right after Jev when the task combines', () => {
		expect(raceRacers(countTask, ['jev', 'llm'])).toEqual(['jev', 'jev_code', 'llm'])
	})
})

describe('raceReducer', () => {
	const start = initialRaceState(['jev', 'llm'], 3)

	it('starts every racer empty', () => {
		expect(start.jev).toMatchObject({
			racer: 'jev',
			itemsTotal: 3,
			inFlight: 0,
			results: [],
			totals: null
		})
		expect(start.jev?.progress.items).toBe(0)
		expect(start.code).toBeUndefined()
	})

	it('counts a started call as in flight', () => {
		const next = raceReducer(start, {
			type: 'item_started',
			racer: 'jev',
			itemId: 't1',
			lane,
			atMs: startMs
		})
		expect(next.jev?.inFlight).toBe(1)
		expect(next.llm).toBe(start.llm)
	})

	it('adds a finished result and recomputes the live totals with the runner', () => {
		const started = raceReducer(start, {
			type: 'item_started',
			racer: 'jev',
			itemId: 't1',
			lane,
			atMs: startMs
		})
		const next = raceReducer(started, {
			type: 'item_finished',
			racer: 'jev',
			lane,
			atMs: endMs,
			result
		})
		expect(next.jev?.inFlight).toBe(0)
		expect(next.jev?.results).toEqual([result])
		expect(next.jev?.progress).toMatchObject({ items: 1, correct: 1, accuracy: 1, wallMs: endMs })
	})

	it('takes the recorded totals when the run finishes', () => {
		const next = raceReducer(start, {
			type: 'run_finished',
			racer: 'jev',
			atMs: 120,
			totals: jevRecording.totals
		})
		expect(next.jev?.totals).toEqual(jevRecording.totals)
	})

	it('ignores events for a racer that is not in the race', () => {
		const next = raceReducer(start, {
			type: 'item_started',
			racer: 'code',
			itemId: 't1',
			lane,
			atMs: startMs
		})
		expect(next).toBe(start)
	})
})

describe('racerTimeMs', () => {
	it('follows the race clock until the racer finishes, then shows its recorded wall time', () => {
		const state = initialRaceState(['jev'], 3)
		const racer = state.jev
		if (!racer) throw new Error('missing racer')
		expect(racerTimeMs(racer, 75)).toBe(75)
		expect(racerTimeMs({ ...racer, totals: jevRecording.totals }, 5000)).toBe(120)
	})
})
