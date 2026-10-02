import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import { createElement, type ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { LEVEL_STATUS } from '@/lib/constants'

const setLevelStatus = vi.fn()
const toast = vi.fn()
vi.mock('@/server/actions/progress', () => ({
	setLevelStatus: (input: unknown) => setLevelStatus(input)
}))
vi.mock('@/lib/toast', () => ({ toast: (input: unknown) => toast(input) }))

const { useSkipLevel } = await import('./use-skip-level')

function render() {
	const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } })
	const wrapper = ({ children }: { children: ReactNode }) =>
		createElement(QueryClientProvider, { client }, children)
	return renderHook(() => useSkipLevel({}), { wrapper })
}

beforeEach(() => {
	setLevelStatus.mockReset()
	toast.mockReset()
})

describe('useSkipLevel', () => {
	it('marks the level skipped at once and confirms', async () => {
		setLevelStatus.mockResolvedValue({ ok: true, data: { status: LEVEL_STATUS.skipped } })
		const { result } = render()
		act(() => result.current.skip('a'))
		expect(result.current.statuses.a).toBe(LEVEL_STATUS.skipped)
		expect(result.current.pendingLevelId).toBe('a')
		await waitFor(() => expect(toast).toHaveBeenCalled())
		expect(setLevelStatus).toHaveBeenCalledWith({ levelId: 'a', status: LEVEL_STATUS.skipped })
		expect(toast.mock.calls[0]?.[0].variant).not.toBe('destructive')
		await waitFor(() => expect(result.current.pendingLevelId).toBeNull())
	})

	it('rolls back and shows a destructive toast on failure', async () => {
		setLevelStatus.mockResolvedValue({ ok: false, error: 'nope' })
		const { result } = render()
		act(() => result.current.skip('a'))
		await waitFor(() => expect(toast).toHaveBeenCalled())
		expect(result.current.statuses.a).toBeUndefined()
		expect(toast.mock.calls[0]?.[0].variant).toBe('destructive')
	})
})
