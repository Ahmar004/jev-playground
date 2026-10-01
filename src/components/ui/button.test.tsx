import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { Button } from './button'

describe('Button', () => {
	it('calls onClick when pressed', async () => {
		const onClick = vi.fn()
		render(<Button onClick={onClick}>Play</Button>)

		await userEvent.click(screen.getByRole('button', { name: 'Play' }))

		expect(onClick).toHaveBeenCalledOnce()
	})

	it('does not call onClick when disabled', async () => {
		const onClick = vi.fn()
		render(
			<Button onClick={onClick} disabled>
				Play
			</Button>
		)

		await userEvent.click(screen.getByRole('button', { name: 'Play' }))

		expect(onClick).not.toHaveBeenCalled()
		expect(screen.getByRole('button', { name: 'Play' })).toBeDisabled()
	})
})
