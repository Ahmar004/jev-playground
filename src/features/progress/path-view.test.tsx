import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { LEVEL_STATUS } from '@/lib/constants'
import { PathView } from './path-view'

const levels = [
	{ id: 'a', order: 1, title: 'Alpha' },
	{ id: 'b', order: 2, title: 'Beta' },
	{ id: 'c', order: 3, title: 'Gamma' },
	{ id: 'd', order: 4, title: 'Delta' }
]
const statuses = {
	b: LEVEL_STATUS.inProgress,
	c: LEVEL_STATUS.done,
	d: LEVEL_STATUS.skipped
}

describe('PathView', () => {
	it('shows the right actions per status', () => {
		render(<PathView levels={levels} statuses={statuses} pendingLevelId={null} onSkip={vi.fn()} />)
		expect(screen.getByRole('link', { name: /Play/ }).getAttribute('href')).toBe('/levels/a')
		expect(screen.getByRole('link', { name: /Continue/ }).getAttribute('href')).toBe('/levels/b')
		expect(screen.getAllByRole('link', { name: /Revisit/ })).toHaveLength(2)
		expect(screen.getAllByRole('button', { name: /Skip/ })).toHaveLength(2)
	})

	it('calls onSkip with the level id', () => {
		const onSkip = vi.fn()
		render(<PathView levels={levels} statuses={{}} pendingLevelId={null} onSkip={onSkip} />)
		fireEvent.click(screen.getAllByRole('button', { name: /Skip/ })[1]!)
		expect(onSkip).toHaveBeenCalledWith('b')
	})

	it('disables the pending level skip button', () => {
		render(<PathView levels={levels} statuses={{}} pendingLevelId="a" onSkip={vi.fn()} />)
		const buttons = screen.getAllByRole('button', { name: /Skip/ })
		expect((buttons[0] as HTMLButtonElement).disabled).toBe(true)
		expect((buttons[1] as HTMLButtonElement).disabled).toBe(false)
	})
})
