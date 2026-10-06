import { act, renderHook, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { NETWORK_ERROR_MESSAGE, useAuthForm } from './use-auth-form'

vi.mock('next/navigation', async (original) => ({
	...(await original<typeof import('next/navigation')>()),
	unstable_rethrow: () => {}
}))
const toast = vi.hoisted(() => vi.fn())
vi.mock('@/lib/toast', () => ({ toast }))

const VALUES = { email: 'ada@example.com', password: 'correct-horse-9' }

describe('useAuthForm', () => {
	it('shows the action error and stops pending', async () => {
		const action = vi
			.fn()
			.mockResolvedValue({ ok: false, error: 'Too many attempts.', status: 429 })
		const { result } = renderHook(() => useAuthForm(action))

		act(() => result.current.submit(VALUES))

		await waitFor(() => expect(result.current.error).toBe('Too many attempts.'))
		expect(result.current.pending).toBe(false)
		expect(action).toHaveBeenCalledWith(VALUES)
	})

	it('also toasts a rate limit, and only a rate limit', async () => {
		const action = vi
			.fn()
			.mockResolvedValueOnce({ ok: false, error: 'Wrong password.', status: 401 })
			.mockResolvedValueOnce({
				ok: false,
				error: 'Too many attempts. Wait 40 seconds.',
				status: 429
			})
		const { result } = renderHook(() => useAuthForm(action))
		act(() => result.current.submit(VALUES))
		await waitFor(() => expect(result.current.error).toBe('Wrong password.'))
		expect(toast).not.toHaveBeenCalled()
		act(() => result.current.submit(VALUES))
		await waitFor(() => expect(result.current.error).toBe('Too many attempts. Wait 40 seconds.'))
		expect(toast).toHaveBeenCalledWith(
			expect.objectContaining({ description: 'Too many attempts. Wait 40 seconds.' })
		)
	})

	it('clears an old error on the next submit', async () => {
		let release: (value: unknown) => void = () => {}
		const action = vi
			.fn()
			.mockResolvedValueOnce({ ok: false, error: 'Wrong password.', status: 401 })
			.mockReturnValueOnce(new Promise((resolve) => (release = resolve)))
		const { result } = renderHook(() => useAuthForm(action))

		act(() => result.current.submit(VALUES))
		await waitFor(() => expect(result.current.error).toBe('Wrong password.'))
		act(() => result.current.submit(VALUES))

		await waitFor(() => expect(result.current.pending).toBe(true))
		expect(result.current.error).toBeNull()
		// Settle it: a transition that never ends would hold later tests pending.
		await act(async () => release({ ok: false, error: 'Done.', status: 500 }))
	})

	it('shows a network message when the action throws', async () => {
		const action = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'))
		const { result } = renderHook(() => useAuthForm(action))

		await act(async () => result.current.submit(VALUES))

		expect(result.current.error).toBe(NETWORK_ERROR_MESSAGE)
		expect(result.current.pending).toBe(false)
	})
})
