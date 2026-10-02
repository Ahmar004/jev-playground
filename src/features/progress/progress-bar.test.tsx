import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ProgressBar } from './progress-bar'

describe('ProgressBar', () => {
	it('exposes aria values, text and a link to the path', () => {
		render(<ProgressBar done={1} total={1} />)
		const bar = screen.getByRole('progressbar', { name: 'Path progress' })
		expect(bar.getAttribute('aria-valuenow')).toBe('1')
		expect(bar.getAttribute('aria-valuemin')).toBe('0')
		expect(bar.getAttribute('aria-valuemax')).toBe('1')
		expect(screen.getByText('1/1')).toBeTruthy()
		expect(screen.getByRole('link').getAttribute('href')).toBe('/path')
	})

	it('does not divide by zero', () => {
		render(<ProgressBar done={0} total={0} />)
		expect(screen.getByText('0/0')).toBeTruthy()
	})
})
