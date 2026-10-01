import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { AuthForm } from './auth-form'

describe('AuthForm', () => {
	it('submits the typed email and password with Enter', async () => {
		const onSubmit = vi.fn()
		render(<AuthForm mode="sign-in" pending={false} error={null} onSubmit={onSubmit} />)

		await userEvent.type(screen.getByLabelText('Email'), 'ada@example.com')
		await userEvent.type(screen.getByLabelText('Password'), 'correct-horse-9{Enter}')

		expect(onSubmit).toHaveBeenCalledWith({ email: 'ada@example.com', password: 'correct-horse-9' })
	})

	it('labels the button for the mode', () => {
		render(<AuthForm mode="sign-up" pending={false} error={null} onSubmit={vi.fn()} />)

		expect(screen.getByRole('button', { name: 'Create account' })).toBeInTheDocument()
		expect(screen.getByLabelText('Password')).toHaveAttribute('minlength', '8')
		expect(screen.getByLabelText('Password')).toHaveAttribute('autocomplete', 'new-password')
	})

	it('shows the error and disables the button while pending', () => {
		render(
			<AuthForm
				mode="sign-in"
				pending
				error="That email and password do not match an account."
				onSubmit={vi.fn()}
			/>
		)

		expect(screen.getByRole('alert')).toHaveTextContent(
			'That email and password do not match an account.'
		)
		expect(screen.getByRole('button', { name: /sign in/i })).toBeDisabled()
	})
})
