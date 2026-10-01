import { act, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { choiceTask } from '@/runner/testing/tasks'
import { RaceStage } from './race-stage'
import { jevRecording, opusRecording } from './testing/recordings'

beforeEach(() => vi.useFakeTimers())
afterEach(() => vi.useRealTimers())

describe('RaceStage', () => {
	it('plays Jev against the opponent and lands on the recorded numbers', async () => {
		render(<RaceStage task={choiceTask} jev={jevRecording} opponent={opusRecording} />)
		act(() => screen.getByRole('button', { name: 'Start the race' }).click())
		await act(async () => {
			await vi.advanceTimersByTimeAsync(1200)
		})
		expect(screen.getByRole('status')).toHaveTextContent('Finished')
		expect(screen.getByRole('table', { name: /Final numbers/ })).toHaveTextContent('$0.0024')
	})

	it('skips straight to the recorded result', async () => {
		render(<RaceStage task={choiceTask} jev={jevRecording} opponent={opusRecording} />)
		act(() => screen.getByRole('button', { name: 'Start the race' }).click())
		await act(async () => {
			screen.getByRole('button', { name: 'Skip to result' }).click()
		})
		expect(screen.getByRole('status')).toHaveTextContent('Finished')
	})
})
