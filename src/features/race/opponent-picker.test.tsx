import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { OpponentPicker } from './opponent-picker'

const OPTIONS = ['claude-opus-5-5', 'claude-sonnet-5-5', 'claude-haiku-4-5-20251001']

describe('OpponentPicker', () => {
	it('shows the current opponent and switches to another one', async () => {
		const onChange = vi.fn()
		render(<OpponentPicker value="claude-opus-5-5" options={OPTIONS} onChange={onChange} />)
		await userEvent.click(screen.getByRole('button', { name: /Opponent: Claude Opus 5.5/ }))
		expect(screen.getByRole('radio', { name: 'Claude Opus 5.5' })).toBeChecked()
		await userEvent.click(screen.getByRole('radio', { name: 'Claude Haiku 4.5' }))
		expect(onChange).toHaveBeenCalledWith('claude-haiku-4-5-20251001')
	})

	it('moves between options with the arrow keys without closing or picking', async () => {
		const onChange = vi.fn()
		render(<OpponentPicker value="claude-opus-5-5" options={OPTIONS} onChange={onChange} />)
		await userEvent.click(screen.getByRole('button', { name: /Opponent: Claude Opus 5.5/ }))
		screen.getByRole('radio', { name: 'Claude Opus 5.5' }).focus()
		await userEvent.keyboard('{ArrowDown}')
		expect(screen.getByRole('radio', { name: 'Claude Sonnet 5.5' })).toHaveFocus()
		expect(onChange).not.toHaveBeenCalled()
		await userEvent.keyboard('{Enter}')
		expect(onChange).toHaveBeenCalledWith('claude-sonnet-5-5')
		expect(screen.queryByRole('radio')).not.toBeInTheDocument()
	})

	it('opens with focus on the current opponent, not the first option', async () => {
		render(
			<OpponentPicker value="claude-haiku-4-5-20251001" options={OPTIONS} onChange={vi.fn()} />
		)
		await userEvent.click(screen.getByRole('button', { name: /Opponent: Claude Haiku 4.5/ }))
		expect(screen.getByRole('radio', { name: 'Claude Haiku 4.5' })).toHaveFocus()
	})

	it('picks with a click and closes', async () => {
		const onChange = vi.fn()
		render(<OpponentPicker value="claude-opus-5-5" options={OPTIONS} onChange={onChange} />)
		await userEvent.click(screen.getByRole('button', { name: /Opponent: Claude Opus 5.5/ }))
		await userEvent.click(screen.getByRole('radio', { name: 'Claude Sonnet 5.5' }))
		expect(onChange).toHaveBeenCalledWith('claude-sonnet-5-5')
		expect(screen.queryByRole('radio')).not.toBeInTheDocument()
	})

	it('closes on Escape without changing the opponent', async () => {
		const onChange = vi.fn()
		render(<OpponentPicker value="claude-opus-5-5" options={OPTIONS} onChange={onChange} />)
		await userEvent.click(screen.getByRole('button', { name: /Opponent: Claude Opus 5.5/ }))
		screen.getByRole('radio', { name: 'Claude Opus 5.5' }).focus()
		await userEvent.keyboard('{ArrowDown}{Escape}')
		expect(screen.queryByRole('radio')).not.toBeInTheDocument()
		expect(onChange).not.toHaveBeenCalled()
	})
})
