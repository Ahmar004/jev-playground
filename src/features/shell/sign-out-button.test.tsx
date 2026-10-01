import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { SignOutButton } from './sign-out-button'

describe('SignOutButton', () => {
	it('calls onSignOut when pressed', async () => {
		const onSignOut = vi.fn()
		render(<SignOutButton pending={false} onSignOut={onSignOut} />)

		await userEvent.click(screen.getByRole('button', { name: 'Sign out' }))

		expect(onSignOut).toHaveBeenCalledOnce()
	})

	it('is disabled while signing out', () => {
		render(<SignOutButton pending onSignOut={vi.fn()} />)

		expect(screen.getByRole('button', { name: 'Sign out' })).toBeDisabled()
	})
})
