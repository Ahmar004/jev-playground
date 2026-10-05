import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { ScrollRegion } from './scroll-region'

describe('ScrollRegion', () => {
	it('is a labelled region that a keyboard can reach', async () => {
		const user = userEvent.setup()
		render(
			<ScrollRegion label="Wide table" className="overflow-x-auto">
				<table />
			</ScrollRegion>
		)
		const region = screen.getByRole('region', { name: 'Wide table' })
		expect(region).toHaveAttribute('tabindex', '0')
		expect(region).toHaveClass('overflow-x-auto')
		await user.tab()
		expect(region).toHaveFocus()
	})
})
