import { act, renderHook, waitFor } from '@testing-library/react'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { PROVIDER_ERROR_KINDS, QUESTION_KINDS } from '@/lib/constants'
import { stopOnProviderFailure } from '@/runner/live'
import type { ItemResult, ItemRunner } from '@/runner/types'
import { jevProbability, trickFooled } from './pairs'
import { TRICK_TEXT_MAX, useLiveTrick, type TrickRun } from './use-live-trick'

// The caller keeps the attempts (the level stepper does, so Reveal can show them), newest first.
function useTrickWithAttempts() {
	const [attempts, setAttempts] = useState<TrickRun[]>([])
	const trick = useLiveTrick({ onAttempt: (run) => setAttempts((current) => [run, ...current]) })
	return { ...trick, attempts }
}

function result(extra: Partial<ItemResult> = {}): ItemResult {
	return {
		itemId: 'yours-1',
		ok: true,
		raw: '{"answer":{"type":"noul","noul":0.2}}',
		parsed: { answer: { type: QUESTION_KINDS.noul, noul: 0.2 } },
		credit: 1,
		correct: true,
		latencyMs: 120,
		usage: { inputTokens: 30, outputTokens: 1 },
		costUsd: 0.00001,
		...extra
	}
}

describe('trickFooled', () => {
	it('is false when Jev answered right', () => {
		expect(trickFooled(result())).toBe(false)
	})

	it('is true when Jev answered wrong', () => {
		expect(trickFooled(result({ credit: 0, correct: false }))).toBe(true)
	})

	it('counts a reply that did not parse as a miss (R44)', () => {
		expect(trickFooled(result({ ok: false, parsed: null, credit: 0, correct: false }))).toBe(true)
	})
})

describe('jevProbability', () => {
	it("reads Jev's Noul probability", () => {
		expect(jevProbability(result().parsed)).toBe(0.2)
	})

	it('is null when the answer did not parse', () => {
		expect(jevProbability(null)).toBeNull()
		expect(jevProbability({ answer: { type: 'choice', choice: 'x' } })).toBeNull()
	})
})

describe('useLiveTrick', () => {
	it('starts with no attempts', () => {
		const { result: hook } = renderHook(() => useTrickWithAttempts())
		expect(hook.current.attempts).toEqual([])
		expect(hook.current.pending).toBe(false)
		expect(hook.current.failure).toBeNull()
	})

	it("sends the user's text and right answer as one item, and keeps the newest attempt first", async () => {
		const run = vi.fn<ItemRunner>(async (item) => result({ itemId: item.id }))
		const { result: hook } = renderHook(() => useTrickWithAttempts())
		act(() => hook.current.ask({ text: '  Please stop my plan  ', label: true }, run))
		expect(hook.current.pending).toBe(true)
		await waitFor(() => expect(hook.current.pending).toBe(false))
		expect(run).toHaveBeenCalledTimes(1)
		const [item] = run.mock.calls[0] ?? []
		expect(item).toMatchObject({ state: 'Please stop my plan', label: true })

		act(() => hook.current.ask({ text: 'Second try', label: false }, run))
		await waitFor(() => expect(hook.current.attempts).toHaveLength(2))
		expect(hook.current.attempts[0]).toMatchObject({ text: 'Second try', label: false })
		expect(hook.current.attempts[1]).toMatchObject({ text: 'Please stop my plan', label: true })
		expect(hook.current.attempts[0]?.id).not.toBe(hook.current.attempts[1]?.id)
		expect(hook.current.attempts[0]?.ranAt).toMatch(/^\d{4}-\d{2}-\d{2}T/)
	})

	it('ignores empty text, text over the limit, and a second ask while one is pending', async () => {
		let release: (value: ItemResult) => void = () => undefined
		const run = vi.fn<ItemRunner>(
			() =>
				new Promise<ItemResult>((resolve) => {
					release = resolve
				})
		)
		const { result: hook } = renderHook(() => useTrickWithAttempts())
		act(() => hook.current.ask({ text: '   ', label: true }, run))
		act(() => hook.current.ask({ text: 'x'.repeat(TRICK_TEXT_MAX + 1), label: true }, run))
		expect(run).not.toHaveBeenCalled()
		act(() => hook.current.ask({ text: 'one', label: true }, run))
		act(() => hook.current.ask({ text: 'two', label: true }, run))
		expect(run).toHaveBeenCalledTimes(1)
		await act(async () => release(result()))
		expect(hook.current.attempts).toHaveLength(1)
	})

	it('keeps a reply that did not parse as an attempt, with its raw output', async () => {
		const run: ItemRunner = async (item) =>
			result({
				itemId: item.id,
				ok: false,
				raw: 'garbled',
				parsed: null,
				credit: 0,
				correct: false
			})
		const { result: hook } = renderHook(() => useTrickWithAttempts())
		act(() => hook.current.ask({ text: 'hello', label: true }, run))
		await waitFor(() => expect(hook.current.attempts).toHaveLength(1))
		expect(hook.current.attempts[0]?.result.raw).toBe('garbled')
		expect(hook.current.failure).toBeNull()
	})

	it('stops on a failure that would repeat, keeps earlier attempts, and clears it on the next ask', async () => {
		const good: ItemRunner = async (item) => result({ itemId: item.id })
		const bad = stopOnProviderFailure(async (item) =>
			result({ itemId: item.id, ok: false, error: PROVIDER_ERROR_KINDS.invalidKey })
		)
		const { result: hook } = renderHook(() => useTrickWithAttempts())
		act(() => hook.current.ask({ text: 'first', label: true }, good))
		await waitFor(() => expect(hook.current.attempts).toHaveLength(1))
		act(() => hook.current.ask({ text: 'second', label: true }, bad))
		await waitFor(() => expect(hook.current.failure).toEqual({ kind: 'invalid_key', racer: 'jev' }))
		expect(hook.current.pending).toBe(false)
		expect(hook.current.attempts).toHaveLength(1)
		expect(hook.current.lastInput).toEqual({ text: 'second', label: true })
		act(() => hook.current.ask({ text: 'third', label: true }, good))
		expect(hook.current.failure).toBeNull()
		await waitFor(() => expect(hook.current.attempts).toHaveLength(2))
	})

	it('aborts the call in flight on unmount', () => {
		let seen: AbortSignal | undefined
		const run: ItemRunner = (_item, signal) => {
			seen = signal
			return new Promise<ItemResult>(() => undefined)
		}
		const { result: hook, unmount } = renderHook(() => useTrickWithAttempts())
		act(() => hook.current.ask({ text: 'hello', label: true }, run))
		unmount()
		expect(seen?.aborted).toBe(true)
	})
})
