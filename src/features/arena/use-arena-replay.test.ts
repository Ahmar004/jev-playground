import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { ArenaSide } from './snapshot'
import { useArenaReplay } from './use-arena-replay'

const side = (racer: 'jev' | 'llm', latencyMs: number): ArenaSide => ({
	racer,
	modelId: 'm',
	at: '2026-10-02T06:00:00.000Z',
	result: {
		itemId: 'i',
		ok: true,
		raw: '',
		parsed: null,
		credit: 1,
		correct: true,
		latencyMs,
		usage: { inputTokens: 0, outputTokens: 0 },
		costUsd: 0
	}
})

describe('useArenaReplay', () => {
	beforeEach(() => vi.useFakeTimers())
	afterEach(() => vi.useRealTimers())

	it('shows each side after its own recorded latency, then finishes once', () => {
		const onDone = vi.fn()
		const sides = [side('jev', 700), side('llm', 2000)]
		const { result } = renderHook(() => useArenaReplay(sides, onDone))
		expect(result.current.status).toBe('idle')
		act(() => result.current.run())
		expect(result.current.status).toBe('running')
		act(() => vi.advanceTimersByTime(800))
		expect(result.current.shown).toEqual(['jev'])
		expect(onDone).not.toHaveBeenCalled()
		act(() => vi.advanceTimersByTime(1300))
		expect(result.current.shown).toEqual(['jev', 'llm'])
		expect(result.current.status).toBe('done')
		expect(onDone).toHaveBeenCalledTimes(1)
	})

	it('restarts cleanly when run again, and stops its timers on unmount', () => {
		const onDone = vi.fn()
		const sides = [side('jev', 500), side('llm', 900)]
		const { result, unmount } = renderHook(() => useArenaReplay(sides, onDone))
		act(() => result.current.run())
		act(() => vi.advanceTimersByTime(600))
		act(() => result.current.run())
		expect(result.current.shown).toEqual([])
		unmount()
		act(() => vi.advanceTimersByTime(5000))
		expect(onDone).not.toHaveBeenCalled()
	})
})
