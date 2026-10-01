import { act, renderHook, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { useAuthForm } from './use-auth-form'

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

	it('clears an old error on the next submit', async () => {
		const action = vi
			.fn()
			.mockResolvedValueOnce({ ok: false, error: 'Wrong password.', status: 401 })
			.mockReturnValueOnce(new Promise(() => {}))
		const { result } = renderHook(() => useAuthForm(action))

		act(() => result.current.submit(VALUES))
		await waitFor(() => expect(result.current.error).toBe('Wrong password.'))
		act(() => result.current.submit(VALUES))

		await waitFor(() => expect(result.current.pending).toBe(true))
		expect(result.current.error).toBeNull()
	})
})
