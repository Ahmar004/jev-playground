import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { RacerTag } from './racer-tag'

describe('RacerTag', () => {
	it('always shows the racer name as text next to a hidden icon', () => {
		const { container } = render(<RacerTag racer="llm" modelId="claude-opus-5-5" />)
		expect(screen.getByText('Claude Opus 5.5')).toBeInTheDocument()
		const icons = container.querySelectorAll('svg')
		expect(icons.length).toBeGreaterThan(0)
		for (const icon of icons) expect(icon).toHaveAttribute('aria-hidden', 'true')
	})

	it('shows two icons for Jev + Code', () => {
		const { container } = render(<RacerTag racer="jev_code" />)
		expect(screen.getByText('Jev + Code')).toBeInTheDocument()
		expect(container.querySelectorAll('svg')).toHaveLength(2)
	})
})
