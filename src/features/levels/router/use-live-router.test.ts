import { act, renderHook, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { PROVIDER_ERROR_KINDS, RACE_LANES } from '@/lib/constants'
import { stopOnProviderFailure } from '@/runner/live'
import { choiceTask, noulTask } from '@/runner/testing/tasks'
import type { ItemResult, ItemRunner } from '@/runner/types'
import { useLiveRouter } from './use-live-router'

function liveResult(itemId: string, extra: Partial<ItemResult> = {}): ItemResult {
	return {
		itemId,
		ok: true,
		raw: 'live',
		parsed: null,
		credit: 1,
		correct: true,
		latencyMs: 10,
		usage: { inputTokens: 5, outputTokens: 1 },
		costUsd: 0.001,
		...extra
	}
}

const ok: ItemRunner = async (item) => liveResult(item.id)
const tasks = [choiceTask, noulTask]

describe('useLiveRouter', () => {
	it('starts idle with no results', () => {
		const { result } = renderHook(() => useLiveRouter({ tasks }))
		expect(result.current.status).toBe('idle')
		expect(result.current.results).toEqual({})
		expect(result.current.startedAt).toBeNull()
		expect(result.current.total).toBe(4)
	})

	it('runs the first item of every card for Jev and the LLM, then finishes once', async () => {
		const onFinished = vi.fn()
		const jev = vi.fn(ok)
		const llm = vi.fn(ok)
		const { result } = renderHook(() => useLiveRouter({ tasks, onFinished }))
		act(() => result.current.start(() => ({ jev, llm })))
		expect(result.current.status).toBe('running')
		expect(result.current.startedAt).not.toBeNull()
		await waitFor(() => expect(result.current.status).toBe('finished'))
		expect(jev).toHaveBeenCalledTimes(2)
		expect(llm).toHaveBeenCalledTimes(2)
		expect(jev.mock.calls.map(([item]) => item.id)).toEqual([
			choiceTask.items[0]?.id,
			noulTask.items[0]?.id
		])
		expect(result.current.done).toBe(4)
		expect(result.current.results[choiceTask.id]?.jev?.raw).toBe('live')
		expect(result.current.results[noulTask.id]?.llm?.raw).toBe('live')
		expect(onFinished).toHaveBeenCalledTimes(1)
		// The finished run goes out whole, for Reveal: every card's results and the start.
		expect(onFinished).toHaveBeenCalledWith({
			results: result.current.results,
			startedAt: result.current.startedAt
		})
	})

	it('reports the finish to the latest callback, not the one from when the run started', async () => {
		const first = vi.fn()
		const latest = vi.fn()
		const { result, rerender } = renderHook(
			({ onFinished }: { onFinished: () => void }) => useLiveRouter({ tasks, onFinished }),
			{ initialProps: { onFinished: first } }
		)
		act(() => result.current.start(() => ({ jev: ok, llm: ok })))
		rerender({ onFinished: latest })
		await waitFor(() => expect(result.current.status).toBe('finished'))
		expect(first).not.toHaveBeenCalled()
		expect(latest).toHaveBeenCalledTimes(1)
	})

	it(`keeps at most ${RACE_LANES} calls in flight per racer`, async () => {
		const many = Array.from({ length: RACE_LANES + 2 }, (_, index) => ({
			...choiceTask,
			id: `card-${index}`
		}))
		let inFlight = 0
		let peak = 0
		const slow: ItemRunner = async (item) => {
			inFlight += 1
			peak = Math.max(peak, inFlight)
			await new Promise((resolve) => setTimeout(resolve, 5))
			inFlight -= 1
			return liveResult(item.id)
		}
		const { result } = renderHook(() => useLiveRouter({ tasks: many }))
		act(() => result.current.start(() => ({ jev: slow, llm: ok })))
		await waitFor(() => expect(result.current.status).toBe('finished'))
		expect(peak).toBe(RACE_LANES)
	})

	it('stops on a failure that would repeat, keeps the results so far, and does not finish', async () => {
		const onFinished = vi.fn()
		const badKey = stopOnProviderFailure(async (item) =>
			liveResult(item.id, { ok: false, error: PROVIDER_ERROR_KINDS.invalidKey })
		)
		const { result } = renderHook(() => useLiveRouter({ tasks, onFinished }))
		act(() => result.current.start(() => ({ jev: ok, llm: badKey })))
		await waitFor(() => expect(result.current.status).toBe('finished'))
		expect(result.current.failure).toEqual({ kind: PROVIDER_ERROR_KINDS.invalidKey, racer: 'llm' })
		expect(result.current.results[choiceTask.id]?.llm).toBeUndefined()
		expect(onFinished).not.toHaveBeenCalled()
	})

	it('keeps an unparseable reply as a result (R44)', async () => {
		const miss: ItemRunner = async (item) =>
			liveResult(item.id, { ok: false, credit: 0, correct: false, raw: 'not json' })
		const { result } = renderHook(() => useLiveRouter({ tasks }))
		act(() => result.current.start(() => ({ jev: ok, llm: miss })))
		await waitFor(() => expect(result.current.status).toBe('finished'))
		expect(result.current.failure).toBeNull()
		expect(result.current.results[choiceTask.id]?.llm?.raw).toBe('not json')
	})

	it('aborts the calls in flight when unmounted', async () => {
		let aborted = false
		const hang: ItemRunner = (_item, signal) =>
			new Promise((resolve) => {
				signal.addEventListener('abort', () => {
					aborted = true
					resolve(liveResult('x'))
				})
			})
		const { result, unmount } = renderHook(() => useLiveRouter({ tasks }))
		act(() => result.current.start(() => ({ jev: hang, llm: hang })))
		unmount()
		await waitFor(() => expect(aborted).toBe(true))
	})

	it('can run again after a run, starting from empty results', async () => {
		const { result } = renderHook(() => useLiveRouter({ tasks }))
		act(() => result.current.start(() => ({ jev: ok, llm: ok })))
		await waitFor(() => expect(result.current.status).toBe('finished'))
		const hang: ItemRunner = () => new Promise(() => {})
		act(() => result.current.start(() => ({ jev: hang, llm: hang })))
		expect(result.current.status).toBe('running')
		expect(result.current.results).toEqual({})
		expect(result.current.done).toBe(0)
	})
})
