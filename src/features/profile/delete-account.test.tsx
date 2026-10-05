import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const remove = vi.hoisted(() => vi.fn())
const state = vi.hoisted(() => ({ pending: false }))
vi.mock('./use-delete-account', () => ({
	useDeleteAccount: () => ({ remove, pending: state.pending })
}))

import { DeleteAccount } from './delete-account'

beforeEach(() => {
	vi.clearAllMocks()
	state.pending = false
})

describe('DeleteAccount', () => {
	it('asks before deleting, and says what goes and that it cannot be undone', async () => {
		const user = userEvent.setup()
		render(<DeleteAccount />)
		expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
		await user.click(screen.getByRole('button', { name: 'Delete my account' }))
		const dialog = screen.getByRole('dialog', { name: 'Delete your account?' })
		expect(dialog).toHaveTextContent(/progress/i)
		expect(dialog).toHaveTextContent(/cannot be undone/i)
		expect(remove).not.toHaveBeenCalled()
	})

	it('Cancel and Esc close it without deleting', async () => {
		const user = userEvent.setup()
		render(<DeleteAccount />)
		await user.click(screen.getByRole('button', { name: 'Delete my account' }))
		await user.click(screen.getByRole('button', { name: 'Cancel' }))
		expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
		await user.click(screen.getByRole('button', { name: 'Delete my account' }))
		await user.keyboard('{Escape}')
		expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
		expect(remove).not.toHaveBeenCalled()
	})

	it('Enter or the confirm button deletes once', async () => {
		const user = userEvent.setup()
		render(<DeleteAccount />)
		await user.click(screen.getByRole('button', { name: 'Delete my account' }))
		await user.click(screen.getByRole('button', { name: 'Yes, delete everything' }))
		expect(remove).toHaveBeenCalledTimes(1)
	})

	it('disables the confirm button while deleting', async () => {
		state.pending = true
		const user = userEvent.setup()
		render(<DeleteAccount />)
		await user.click(screen.getByRole('button', { name: 'Delete my account' }))
		expect(screen.getByRole('button', { name: 'Deleting...' })).toBeDisabled()
	})
})
