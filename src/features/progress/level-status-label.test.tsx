import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { LEVEL_STATUS } from '@/lib/constants'
import { LevelStatusLabel } from './level-status-label'

describe('LevelStatusLabel', () => {
	it.each([
		[null, 'Not started'],
		[LEVEL_STATUS.inProgress, 'In progress'],
		[LEVEL_STATUS.done, 'Done'],
		[LEVEL_STATUS.skipped, 'Skipped']
	] as const)('shows text for %s', (status, text) => {
		render(<LevelStatusLabel status={status} />)
		expect(screen.getByText(text)).toBeTruthy()
	})
})
