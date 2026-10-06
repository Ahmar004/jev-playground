import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

async function freshModule() {
	vi.resetModules()
	return import('./toast')
}

beforeEach(() => {
	vi.useFakeTimers()
})
afterEach(() => {
	vi.useRealTimers()
})

describe('toast', () => {
	it('closes an ordinary toast after a few seconds', async () => {
		const { toast, useToast } = await freshModule()
		const { result } = renderHook(() => useToast())
		act(() => toast({ title: 'Saved' }))
		expect(result.current.toasts).toHaveLength(1)
		act(() => vi.advanceTimersByTime(5000))
		expect(result.current.toasts).toHaveLength(0)
	})

	it('keeps a persistent toast until it is dismissed', async () => {
		const { toast, useToast } = await freshModule()
		const { result } = renderHook(() => useToast())
		act(() => toast({ title: 'Updated', persistent: true }))
		act(() => vi.advanceTimersByTime(60_000))
		expect(result.current.toasts).toHaveLength(1)
		act(() => result.current.dismiss(result.current.toasts[0]?.id ?? ''))
		expect(result.current.toasts).toHaveLength(0)
	})

	it('shows a keyed toast once while it is still on screen', async () => {
		const { toast, useToast } = await freshModule()
		const { result } = renderHook(() => useToast())
		act(() => {
			toast({ key: 'stale', title: 'Updated', persistent: true })
			toast({ key: 'stale', title: 'Updated', persistent: true })
		})
		expect(result.current.toasts).toHaveLength(1)
		act(() => result.current.dismiss(result.current.toasts[0]?.id ?? ''))
		act(() => toast({ key: 'stale', title: 'Updated', persistent: true }))
		expect(result.current.toasts).toHaveLength(1)
	})
})
