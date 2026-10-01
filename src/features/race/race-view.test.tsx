import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { initialRaceState, raceReducer } from './race-state'
import { RaceView, type RaceTrackData } from './race-view'
import { jevRecording, opusRecording } from './testing/recordings'

function tracks(finished: boolean): RaceTrackData[] {
	let state = initialRaceState(['jev', 'llm'], 3)
	if (finished) {
		state = raceReducer(state, {
			type: 'run_finished',
			racer: 'jev',
			atMs: 120,
			totals: jevRecording.totals
		})
		state = raceReducer(state, {
			type: 'run_finished',
			racer: 'llm',
			atMs: 1100,
			totals: opusRecording.totals
		})
	}
	const jev = state.jev
	const llm = state.llm
	if (!jev || !llm) throw new Error('missing racer')
	return [
		{
			racer: 'jev',
			modelId: jevRecording.modelId,
			recordedAt: jevRecording.recordedAt,
			state: jev
		},
		{
			racer: 'llm',
			modelId: opusRecording.modelId,
			recordedAt: opusRecording.recordedAt,
			state: llm
		}
	]
}

const noop = () => undefined

describe('RaceView', () => {
	it('offers Start when idle and labels every racer with its mode label', async () => {
		const onStart = vi.fn()
		render(
			<RaceView
				tracks={tracks(false)}
				status="idle"
				elapsedMs={0}
				lanes={4}
				onStart={onStart}
				onSkip={noop}
			/>
		)
		expect(screen.getByText('Jev')).toBeInTheDocument()
		expect(screen.getByText('Claude Opus 5.5')).toBeInTheDocument()
		expect(
			screen.getByText('Beginner mode - recorded 2026-10-02 - claude-opus-5-5')
		).toBeInTheDocument()
		await userEvent.click(screen.getByRole('button', { name: 'Start the race' }))
		expect(onStart).toHaveBeenCalledOnce()
	})

	it('offers Skip to result while running and shows progress per racer', async () => {
		const onSkip = vi.fn()
		render(
			<RaceView
				tracks={tracks(false)}
				status="running"
				elapsedMs={250}
				lanes={4}
				onStart={noop}
				onSkip={onSkip}
			/>
		)
		const bars = screen.getAllByRole('progressbar')
		expect(bars).toHaveLength(2)
		expect(bars[0]).toHaveAttribute('aria-valuenow', '0')
		expect(bars[0]).toHaveAttribute('aria-valuemax', '3')
		expect(screen.getByRole('status')).toHaveTextContent('Racing')
		await userEvent.click(screen.getByRole('button', { name: 'Skip to result' }))
		expect(onSkip).toHaveBeenCalledOnce()
	})

	it('shows the scoreboard with the recorded totals once finished', () => {
		render(
			<RaceView
				tracks={tracks(true)}
				status="finished"
				elapsedMs={1100}
				lanes={4}
				onStart={noop}
				onSkip={noop}
			/>
		)
		expect(screen.getByRole('table', { name: /Final numbers/ })).toBeInTheDocument()
		expect(screen.getByRole('button', { name: 'Race again' })).toBeInTheDocument()
		expect(screen.getByRole('status')).toHaveTextContent('Finished')
	})
})
