import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ModeLabel } from './mode-label'

describe('ModeLabel', () => {
	it('names the mode, the recording date and the model id (R6, R84)', () => {
		const { container } = render(
			<ModeLabel modelId="claude-opus-5-5" recordedAt="2026-10-02T10:00:00.000Z" />
		)
		expect(container).toHaveTextContent('Beginner mode - recorded 2026-10-02 - claude-opus-5-5')
	})

	it('says Developer mode with the run time and the model that answered (R13)', () => {
		const { container } = render(
			<ModeLabel modelId="gpt-5" recordedAt="2026-10-02T10:00:00.000Z" mode="developer" />
		)
		expect(container).toHaveTextContent(/^Developer mode - run \d{2}:\d{2} - gpt-5$/)
	})

	it('says a live track has not run yet before it starts', () => {
		const { container } = render(<ModeLabel modelId="gpt-5" recordedAt="" mode="developer" />)
		expect(container).toHaveTextContent('Developer mode - not run yet - gpt-5')
	})
})
