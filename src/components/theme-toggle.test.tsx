import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ThemeToggle } from './theme-toggle'

const setTheme = vi.fn()
let resolvedTheme = 'light'

vi.mock('next-themes', () => ({
	useTheme: () => ({ resolvedTheme, setTheme })
}))

describe('ThemeToggle', () => {
	beforeEach(() => {
		setTheme.mockClear()
	})

	it('switches a light page to dark', async () => {
		resolvedTheme = 'light'
		render(<ThemeToggle />)

		await userEvent.click(screen.getByRole('button', { name: 'Switch theme' }))

		expect(setTheme).toHaveBeenCalledWith('dark')
	})

	it('switches a dark page to light', async () => {
		resolvedTheme = 'dark'
		render(<ThemeToggle />)

		await userEvent.click(screen.getByRole('button', { name: 'Switch theme' }))

		expect(setTheme).toHaveBeenCalledWith('light')
	})
})
