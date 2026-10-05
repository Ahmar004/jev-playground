import { act, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { PRICES } from '@/content/prices'
import { MODES, PROVIDERS, RACERS } from '@/lib/constants'
import type { RunTotals } from '@/runner/types'
import { choiceTask } from '@/runner/testing/tasks'
import type { LiveConfig } from './live-config'
import { RaceStage, raceResults } from './race-stage'
import { jevRecording, opusRecording } from './testing/recordings'

const devRun = vi.hoisted(() => ({ record: vi.fn() }))
vi.mock('./use-record-dev-run', () => ({ useRecordDevRun: () => devRun }))

beforeEach(() => {
	vi.useFakeTimers()
	devRun.record.mockClear()
})
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
		// A replay is not a live run, so it earns nothing for Developer mode.
		expect(devRun.record).not.toHaveBeenCalled()
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

function totals(correct: number): RunTotals {
	return {
		items: 3,
		scored: 2,
		correct,
		accuracy: correct / 2,
		wallMs: 900,
		costUsd: 0.002,
		inputTokens: 10,
		outputTokens: 2,
		parseFailures: 0
	}
}

describe('raceResults', () => {
	const finish = { jev: totals(2), jev_code: totals(1), llm: totals(1) }

	it('labels a replay with Beginner mode and each recording date', () => {
		const results = raceResults(finish, jevRecording, opusRecording, undefined, null)
		expect(results.map((result) => result.racer)).toEqual([RACERS.jev, RACERS.jevCode, RACERS.llm])
		expect(results[2]).toMatchObject({
			modelId: opusRecording.modelId,
			recordedAt: opusRecording.recordedAt,
			mode: MODES.beginner,
			totals: finish.llm
		})
		// Jev + Code is Jev's model and recording.
		expect(results[1]).toMatchObject({ modelId: jevRecording.modelId, mode: MODES.beginner })
	})

	it('labels a live run with Developer mode, its start and the models that answered', () => {
		const live: LiveConfig = {
			jevCall: async () => ({
				text: '',
				latencyMs: 1,
				usage: { inputTokens: 0, outputTokens: 0 },
				modelId: 'x'
			}),
			llmCall: async () => ({
				text: '',
				latencyMs: 1,
				usage: { inputTokens: 0, outputTokens: 0 },
				modelId: 'x'
			}),
			jevProvider: PROVIDERS.typesafe,
			llmProvider: PROVIDERS.openai,
			llmModelId: 'gpt-picked',
			prices: PRICES,
			answered: { jev: 'jev-1.13.0', llm: 'gpt-picked-2026-09-01' }
		}
		const startedAt = '2026-10-04T12:00:00.000Z'
		const results = raceResults(finish, jevRecording, opusRecording, live, startedAt)
		expect(results).toEqual([
			{
				racer: RACERS.jev,
				modelId: 'jev-1.13.0',
				recordedAt: startedAt,
				mode: MODES.developer,
				totals: finish.jev
			},
			{
				racer: RACERS.jevCode,
				modelId: 'jev-1.13.0',
				recordedAt: startedAt,
				mode: MODES.developer,
				totals: finish.jev_code
			},
			{
				racer: RACERS.llm,
				modelId: 'gpt-picked-2026-09-01',
				recordedAt: startedAt,
				mode: MODES.developer,
				totals: finish.llm
			}
		])
	})

	it('leaves out a racer that has no totals', () => {
		expect(
			raceResults({ jev: totals(2) }, jevRecording, opusRecording, undefined, null)
		).toHaveLength(1)
	})
})
