import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { levelSchema } from '@/content/level-schema'
import { testLevel } from '@/content/testing/levels'
import { jevRecording, opusRecording, sonnetRecording } from '@/features/race/testing/recordings'
import type { RaceResult } from '@/features/race/race-stage'
import { MODES, RACERS } from '@/lib/constants'
import { choiceTask } from '@/runner/testing/tasks'
import { RevealStep } from './reveal-step'

const confetti = vi.fn()
vi.mock('canvas-confetti', () => ({ default: (options: unknown) => confetti(options) }))

const level = levelSchema.parse(testLevel)

beforeEach(() => {
	confetti.mockReset()
})

function renderReveal(
	prediction = {},
	extra: {
		celebrate?: boolean
		scoredAgainst?: string | null
		onCheck?: () => void
		onCelebrated?: () => void
		liveRuns?: Record<string, RaceResult[]>
	} = {}
) {
	return render(
		<RevealStep
			level={level}
			stages={[
				{
					task: choiceTask,
					title: 'Race',
					judged: true,
					jev: jevRecording,
					opponents: [opusRecording, sonnetRecording]
				}
			]}
			opponentId={opusRecording.modelId}
			prediction={prediction}
			celebrate={extra.celebrate ?? false}
			onCelebrated={extra.onCelebrated ?? (() => undefined)}
			scoredAgainst={extra.scoredAgainst ?? null}
			onReveal={() => undefined}
			onCheck={extra.onCheck ?? (() => undefined)}
			onRaceAgain={() => undefined}
			liveRuns={extra.liveRuns}
		/>
	)
}

const liveRun: RaceResult[] = [
	{
		racer: RACERS.jev,
		modelId: 'jev-live',
		recordedAt: '2026-10-04T14:02:00.000Z',
		mode: MODES.developer,
		totals: { ...jevRecording.totals, costUsd: 0.0042 }
	},
	{
		racer: RACERS.llm,
		modelId: 'gpt-live',
		recordedAt: '2026-10-04T14:02:00.000Z',
		mode: MODES.developer,
		totals: opusRecording.totals
	}
]

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

	it("shows a live run's numbers beside the recorded ones, each with its own label", () => {
		renderReveal({}, { liveRuns: { [choiceTask.id]: liveRun } })
		const table = screen.getByRole('table', { name: /Your live run and every recorded model/ })
		const live = within(table).getByRole('row', { name: /gpt-live/ })
		expect(live).toHaveTextContent(/Developer mode - run .+ - gpt-live/)
		expect(within(table).getByRole('row', { name: /jev-live/ })).toHaveTextContent('$0.0042')
		const recorded = within(table).getByRole('row', { name: /Claude Sonnet 5.5/ })
		expect(recorded).toHaveTextContent(/Beginner mode - recorded/)
		// 2 live rows plus Jev, Opus and Sonnet from the recordings, under the header row.
		expect(within(table).getAllByRole('row')).toHaveLength(6)
		expect(screen.getByText(/Your prediction is scored against the recordings/)).toBeInTheDocument()
	})

	it('shows only the recordings, with no live note, before any live run', () => {
		renderReveal({}, { liveRuns: { 'another-task': liveRun } })
		expect(screen.getByRole('table', { name: /^Every recorded model/ })).toBeInTheDocument()
		expect(screen.queryByText(/Developer mode/)).not.toBeInTheDocument()
		expect(screen.queryByText(/scored against the recordings/)).not.toBeInTheDocument()
	})

	it("shows every item, with a couldn't parse note and the raw output for misses (R44)", async () => {
		renderReveal()
		const summary = screen.getByText('See every item')
		await userEvent.click(summary)
		const details = summary.closest('details')
		if (!details) throw new Error('details missing')
		const items = within(details)
		// Opus and Sonnet (a copy of Opus's events) both failed to parse t2. The scoreboard
		// column header also reads "Couldn't parse", so the items are scoped out.
		expect(items.getAllByText("Couldn't parse")).toHaveLength(2)
		expect(items.getAllByText('Sure! It is technical.')).toHaveLength(2)
	})

	it('waits for recordings before showing results', () => {
		render(
			<RevealStep
				level={level}
				stages={[{ task: choiceTask, title: 'Race', judged: true, jev: undefined, opponents: [] }]}
				opponentId={undefined}
				prediction={{}}
				celebrate={false}
				onCelebrated={() => undefined}
				scoredAgainst={null}
				onReveal={() => undefined}
				onCheck={() => undefined}
				onRaceAgain={() => undefined}
			/>
		)
		expect(screen.getByText(/once this race is recorded/)).toBeInTheDocument()
	})

	it('fires confetti only when told to celebrate', async () => {
		renderReveal({ fastest: 'jev' }, { celebrate: false })
		await new Promise((resolve) => setTimeout(resolve, 20))
		expect(confetti).not.toHaveBeenCalled()
	})

	it('fires confetti once for a celebrated first Reveal', async () => {
		renderReveal({ fastest: 'jev' }, { celebrate: true })
		await waitFor(() => expect(confetti).toHaveBeenCalledTimes(1))
	})

	it('reports the celebration once the confetti fired', async () => {
		const onCelebrated = vi.fn()
		renderReveal({ fastest: 'jev' }, { celebrate: true, onCelebrated })
		await waitFor(() => expect(onCelebrated).toHaveBeenCalledTimes(1))
		expect(confetti).toHaveBeenCalledTimes(1)
	})

	it('opens the Check step from the primary button', async () => {
		const onCheck = vi.fn()
		renderReveal({}, { onCheck })
		await userEvent.click(screen.getByRole('button', { name: 'Check what you learned' }))
		expect(onCheck).toHaveBeenCalled()
	})

	it('notes when the first Reveal was scored against a different model', () => {
		renderReveal({}, { scoredAgainst: sonnetRecording.modelId })
		expect(
			screen.getByText('Your prediction was scored against Claude Sonnet 5.5 on your first Reveal.')
		).toBeInTheDocument()
	})

	it('says nothing extra when scored against the model shown', () => {
		renderReveal({}, { scoredAgainst: opusRecording.modelId })
		expect(screen.queryByText(/on your first Reveal/)).not.toBeInTheDocument()
	})
})
