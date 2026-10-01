import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const signOut = vi.fn()
const toast = vi.fn()

vi.mock('@/server/actions/auth', () => ({ signOut }))
vi.mock('@/lib/toast', () => ({ toast }))
vi.mock('next/navigation', () => ({ unstable_rethrow: () => {} }))

const { NETWORK_ERROR_MESSAGE } = await import('@/features/auth/use-auth-form')
const { useSignOut } = await import('./use-sign-out')

beforeEach(() => {
	vi.clearAllMocks()
})

describe('useSignOut', () => {
	it('toasts the action error', async () => {
		signOut.mockResolvedValue({ ok: false, error: 'Nope', status: 500 })
		const { result } = renderHook(() => useSignOut())

		act(() => result.current.signOut())

		await waitFor(() =>
			expect(toast).toHaveBeenCalledWith({
				title: 'Could not sign out',
				description: 'Nope',
				variant: 'destructive'
			})
		)
	})

	it('toasts a network message when the action throws', async () => {
		signOut.mockRejectedValue(new TypeError('Failed to fetch'))
		const { result } = renderHook(() => useSignOut())

		act(() => result.current.signOut())

		await waitFor(() =>
			expect(toast).toHaveBeenCalledWith({
				title: 'Could not sign out',
				description: NETWORK_ERROR_MESSAGE,
				variant: 'destructive'
			})
		)
	})
})
