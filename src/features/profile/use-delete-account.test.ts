import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const toast = vi.hoisted(() => vi.fn())
const action = vi.hoisted(() => vi.fn())
const rethrow = vi.hoisted(() => vi.fn())
vi.mock('@/lib/toast', () => ({ toast }))
vi.mock('@/server/actions/account', () => ({ deleteAccount: action }))
vi.mock('next/navigation', async (original) => ({
	...(await original<typeof import('next/navigation')>()),
	unstable_rethrow: rethrow
}))

import { NETWORK_ERROR_MESSAGE, useDeleteAccount } from './use-delete-account'

beforeEach(() => vi.clearAllMocks())

describe('useDeleteAccount', () => {
	it('calls the action and is pending until it answers', async () => {
		let answer: (value: unknown) => void = () => {}
		action.mockReturnValue(new Promise((resolve) => (answer = resolve)))
		const { result } = renderHook(() => useDeleteAccount())
		act(() => result.current.remove())
		await waitFor(() => expect(result.current.pending).toBe(true))
		expect(action).toHaveBeenCalledWith(undefined)
		await act(async () => answer({ ok: false, error: 'Something went wrong.', status: 500 }))
		await waitFor(() => expect(result.current.pending).toBe(false))
	})

	it('toasts the action error and stays signed in', async () => {
		action.mockResolvedValue({
			ok: false,
			error: 'Something went wrong. Please try again.',
			status: 500
		})
		const { result } = renderHook(() => useDeleteAccount())
		act(() => result.current.remove())
		await waitFor(() => expect(toast).toHaveBeenCalledTimes(1))
		expect(toast).toHaveBeenCalledWith(
			expect.objectContaining({
				description: 'Something went wrong. Please try again.',
				variant: 'destructive'
			})
		)
	})

	it('gives the redirect after a successful delete to Next first, and toasts a network failure', async () => {
		const failure = new TypeError('Failed to fetch')
		action.mockRejectedValueOnce(failure)
		const { result } = renderHook(() => useDeleteAccount())
		act(() => result.current.remove())
		await waitFor(() =>
			expect(toast).toHaveBeenCalledWith(
				expect.objectContaining({ description: NETWORK_ERROR_MESSAGE })
			)
		)
		// unstable_rethrow runs before the toast, so a real redirect never reaches it.
		expect(rethrow).toHaveBeenCalledWith(failure)
		expect(rethrow.mock.invocationCallOrder[0]).toBeLessThan(toast.mock.invocationCallOrder[0] ?? 0)
	})
})
