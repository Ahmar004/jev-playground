import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { BADGES } from '@/lib/constants'
import { HomeProgress } from './home-progress'

const firstLevel = { id: 'speed-race', order: 1, title: 'Speed Race' }

describe('HomeProgress', () => {
	it('shows the empty-badge copy, XP and the path link', () => {
		render(
			<HomeProgress
				summary={{ statuses: {}, doneCount: 0, levelCount: 1, xp: 0, badges: [] }}
				firstLevel={firstLevel}
			/>
		)
		expect(screen.getByText('0 of 1 levels done')).toBeTruthy()
		expect(screen.getByText('0 XP')).toBeTruthy()
		expect(screen.getByText('No badges yet. Finish level 1 to earn your first.')).toBeTruthy()
		expect(screen.getByRole('link', { name: 'See your path' }).getAttribute('href')).toBe('/path')
	})

	it('lists earned badge names', () => {
		render(
			<HomeProgress
				summary={{
					statuses: {},
					doneCount: 1,
					levelCount: 1,
					xp: 145,
					badges: [BADGES.firstRace]
				}}
				firstLevel={firstLevel}
			/>
		)
		expect(screen.getByText('145 XP')).toBeTruthy()
		expect(screen.getByText('First Race')).toBeTruthy()
	})
})
