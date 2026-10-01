import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { choiceTask } from '@/runner/testing/tasks'
import { jevRecording, opusRecording } from './testing/recordings'
import { useRace, type RaceEntry } from './use-race'

const entries: RaceEntry[] = [
	{ racer: 'jev', recording: jevRecording },
	{ racer: 'llm', recording: opusRecording }
]

function setup() {
	return renderHook(() => useRace({ task: choiceTask, entries }))
}

async function advance(ms: number) {
	await act(async () => {
		await vi.advanceTimersByTimeAsync(ms)
	})
}

beforeEach(() => vi.useFakeTimers())
afterEach(() => vi.useRealTimers())

describe('useRace', () => {
	it('starts idle with an empty state per racer', () => {
		const { result } = setup()
		expect(result.current.status).toBe('idle')
		expect(result.current.racers).toEqual(['jev', 'llm'])
		expect(result.current.perRacer.jev?.results).toEqual([])
		expect(result.current.elapsedMs).toBe(0)
	})

	it('replays each recording at its recorded speed', async () => {
		const { result } = setup()
		act(() => result.current.start())
		expect(result.current.status).toBe('running')

		// Jev's t3 ends at 90 ms, t1 at 100 ms, t2 at 120 ms.
		await advance(95)
		expect(result.current.perRacer.jev?.results).toHaveLength(1)
		expect(result.current.perRacer.llm?.results).toHaveLength(0)

		await advance(30)
		expect(result.current.perRacer.jev?.totals).toEqual(jevRecording.totals)
		expect(result.current.status).toBe('running')

		await advance(1000)
		expect(result.current.perRacer.llm?.totals).toEqual(opusRecording.totals)
		expect(result.current.status).toBe('finished')
	})

	it('ticks the race clock while running', async () => {
		const { result } = setup()
		act(() => result.current.start())
		await advance(500)
		expect(result.current.elapsedMs).toBeGreaterThanOrEqual(400)
		expect(result.current.elapsedMs).toBeLessThanOrEqual(500)
	})

	it('skips to the recorded result', async () => {
		const { result } = setup()
		act(() => result.current.start())
		await advance(10)
		await act(async () => {
			result.current.skip()
		})
		expect(result.current.perRacer.jev?.totals).toEqual(jevRecording.totals)
		expect(result.current.perRacer.llm?.totals).toEqual(opusRecording.totals)
		expect(result.current.status).toBe('finished')
	})

	it('cancels back to idle and drops the rest of the replay', async () => {
		const { result } = setup()
		act(() => result.current.start())
		await advance(100)
		act(() => result.current.cancel())
		expect(result.current.status).toBe('idle')
		expect(result.current.perRacer.jev?.results).toEqual([])

		await advance(2000)
		expect(result.current.perRacer.llm?.results).toEqual([])
		expect(result.current.status).toBe('idle')
	})

	it('can race again after finishing', async () => {
		const { result } = setup()
		act(() => result.current.start())
		await advance(1200)
		expect(result.current.status).toBe('finished')

		act(() => result.current.start())
		expect(result.current.status).toBe('running')
		expect(result.current.perRacer.jev?.results).toEqual([])
	})

	it('stops every timer when unmounted mid-race', async () => {
		const { result, unmount } = setup()
		act(() => result.current.start())
		await advance(50)
		unmount()
		expect(vi.getTimerCount()).toBe(0)
	})
})
