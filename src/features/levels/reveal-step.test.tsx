import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { levelSchema } from '@/content/level-schema'
import { testLevel } from '@/content/testing/levels'
import { jevRecording, opusRecording, sonnetRecording } from '@/features/race/testing/recordings'
import { choiceTask } from '@/runner/testing/tasks'
import { RevealStep } from './reveal-step'

vi.mock('canvas-confetti', () => ({ default: vi.fn() }))

const level = levelSchema.parse(testLevel)

function renderReveal(prediction = {}) {
	return render(
		<RevealStep
			level={level}
			task={choiceTask}
			jev={jevRecording}
			opponent={opusRecording}
			others={[sonnetRecording]}
			prediction={prediction}
			onRaceAgain={() => undefined}
		/>
	)
}

describe('RevealStep', () => {
	it('marks each prediction against the recorded numbers', () => {
		renderReveal({ fastest: 'jev', cheapest: 'llm', most_accurate: 'jev' })
		const results = screen.getByRole('list', { name: 'Your prediction' })
		const items = within(results).getAllByRole('listitem')
		expect(items[0]).toHaveTextContent('Who finishes first?')
		expect(items[0]).toHaveTextContent('You got it')
		expect(items[1]).toHaveTextContent('Not this time')
		expect(items[2]).toHaveTextContent('You got it')
	})

	it('says when no prediction was made', () => {
		renderReveal()
		expect(screen.getAllByText('No prediction')).toHaveLength(3)
	})

	it('shows every recorded model with its numbers, the why and the docs link', () => {
		renderReveal()
		const table = screen.getByRole('table')
		expect(within(table).getByRole('row', { name: /Claude Sonnet 5.5/ })).toBeInTheDocument()
		expect(screen.getByText('Because one answers directly.')).toBeInTheDocument()
		expect(screen.getByRole('link', { name: /System One models/ })).toHaveAttribute(
			'href',
			'https://docs.typesafe.ai/concepts/system-one'
		)
	})

	it("shows every item, with a couldn't parse note and the raw output for misses (R44)", async () => {
		renderReveal()
		const summary = screen.getByText('See every item')
		await userEvent.click(summary)
		const items = within(summary.closest('details') as HTMLElement)
		// Opus and Sonnet (a copy of Opus's events) both failed to parse t2. The scoreboard
		// column header also reads "Couldn't parse", so the items are scoped out.
		expect(items.getAllByText("Couldn't parse")).toHaveLength(2)
		expect(items.getAllByText('Sure! It is technical.')).toHaveLength(2)
	})

	it('waits for recordings before showing results', () => {
		render(
			<RevealStep
				level={level}
				task={choiceTask}
				jev={undefined}
				opponent={undefined}
				others={[]}
				prediction={{}}
				onRaceAgain={() => undefined}
			/>
		)
		expect(screen.getByText(/once this race is recorded/)).toBeInTheDocument()
	})
})
