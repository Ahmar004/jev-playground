import { act, renderHook, waitFor } from '@testing-library/react'
import { useMutation } from '@tanstack/react-query'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const toast = vi.fn()
vi.mock('@/lib/toast', () => ({ toast }))

const { UnrecognizedActionError } =
	await import('next/dist/client/components/unrecognized-action-error')
const { QueryProvider } = await import('./query-provider')

beforeEach(() => {
	toast.mockClear()
})

function renderMutation(fail: Error) {
	return renderHook(
		// A quiet mutation with no onError of its own, like recording a level's first play.
		() => useMutation({ mutationFn: () => Promise.reject(fail) }),
		{ wrapper: QueryProvider }
	)
}

describe('QueryProvider', () => {
	it('asks for a reload when any Server Action was left behind by a deploy', async () => {
		const { result } = renderMutation(
			new UnrecognizedActionError('Server Action "abc" was not found')
		)
		act(() => result.current.mutate())
		await waitFor(() =>
			expect(toast).toHaveBeenCalledWith(
				expect.objectContaining({ title: 'The site was just updated', persistent: true })
			)
		)
	})

	it('leaves every other failure to the mutation that made it', async () => {
		const { result } = renderMutation(new Error('Try again in a moment.'))
		act(() => result.current.mutate())
		await waitFor(() => expect(result.current.isError).toBe(true))
		expect(toast).not.toHaveBeenCalled()
	})
})
