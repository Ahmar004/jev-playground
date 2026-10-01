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
})
