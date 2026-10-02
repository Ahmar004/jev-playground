import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { MODES } from '@/lib/constants'
import { SharedResult } from './shared-result'
import { SideCard } from './side-card'
import type { ArenaSide, ArenaSnapshot } from './snapshot'

const AT = '2026-10-02T06:00:00.000Z'
const result = {
	itemId: 'i1',
	ok: true,
	raw: '{}',
	parsed: null as unknown,
	credit: 1 as number | null,
	correct: true as boolean | null,
	latencyMs: 732.8,
	usage: { inputTokens: 447, outputTokens: 53 },
	costUsd: 0.0000187 as number | null
}

const jevChoice: ArenaSide = {
	racer: 'jev',
	modelId: 'jev-1.13.0',
	at: AT,
	result: {
		...result,
		parsed: {
			answer: {
				type: 'choice',
				choice: 'billing',
				probabilities: { billing: 0.9, account: 0.1 },
				confidence: 0.9
			}
		}
	}
}

describe('SideCard', () => {
	it('shows the answer, probabilities, confidence, latency, cost and the mode label', () => {
		render(<SideCard side={jevChoice} mode={MODES.beginner} />)
		expect(screen.getByText('Picked: billing')).toBeInTheDocument()
		expect(screen.getByText('90%', { selector: 'span.tabular-nums' })).toBeInTheDocument()
		expect(screen.getByText('Confidence: 90%')).toBeInTheDocument()
		expect(screen.getByText('733 ms')).toBeInTheDocument()
		expect(screen.getByText('Right')).toBeInTheDocument()
		expect(screen.getByText(/Beginner mode - recorded 2026-10-02 - jev-1.13.0/)).toBeInTheDocument()
	})

	it('shows an unparseable reply as raw text with a note, never hidden (R44)', () => {
		const side: ArenaSide = {
			racer: 'llm',
			modelId: 'claude-sonnet-5-5',
			at: AT,
			result: {
				...result,
				ok: false,
				raw: 'Sure! The answer is billing.',
				credit: 0,
				correct: false
			}
		}
		render(<SideCard side={side} mode={MODES.beginner} />)
		expect(screen.getByText("Couldn't parse")).toBeInTheDocument()
		expect(screen.getByText(/counts as a miss/)).toBeInTheDocument()
		expect(screen.getByText('Sure! The answer is billing.')).toBeInTheDocument()
	})

	it('says "not scored" and "price unknown" instead of inventing a verdict or a cost', () => {
		const side: ArenaSide = {
			...jevChoice,
			result: { ...jevChoice.result, correct: null, credit: null, costUsd: null }
		}
		render(<SideCard side={side} mode={MODES.developer} />)
		expect(screen.getByText('not scored')).toBeInTheDocument()
		expect(screen.getByText('price unknown')).toBeInTheDocument()
		expect(screen.getByText(/Developer mode - run /)).toBeInTheDocument()
	})
})

describe('SharedResult', () => {
	const snapshot: ArenaSnapshot = {
		mode: MODES.developer,
		title: 'Custom task',
		question: 'Is this a complaint?',
		state: '<img src=x onerror=alert(1)>',
		sides: [jevChoice]
	}

	it('labels a Developer share as run by a user and renders user text as plain text (R86)', () => {
		const { container } = render(<SharedResult snapshot={snapshot} />)
		expect(screen.getByText(/Developer mode, run by a user/)).toBeInTheDocument()
		expect(screen.getByText('<img src=x onerror=alert(1)>')).toBeInTheDocument()
		expect(container.querySelector('img')).toBeNull()
	})

	it('keeps the Beginner mode label on a Beginner share', () => {
		render(<SharedResult snapshot={{ ...snapshot, mode: MODES.beginner, expected: 'billing' }} />)
		expect(screen.getByText(/Beginner mode: replayed from real recordings/)).toBeInTheDocument()
		expect(screen.getByText(/Expected answer:/)).toHaveTextContent('Expected answer: billing')
	})
})
