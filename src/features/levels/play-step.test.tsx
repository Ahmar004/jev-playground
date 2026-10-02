import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { jevRecording, opusRecording, sonnetRecording } from '@/features/race/testing/recordings'
import { choiceTask } from '@/runner/testing/tasks'
import type { Recording } from '@/content/recording-schema'
import type { LevelStage } from './lineup'
import { PlayStep } from './play-step'

const stage = (jev: Recording | undefined, opponents: Recording[]): LevelStage => ({
	task: choiceTask,
	title: 'Race',
	judged: true,
	jev,
	opponents
})

describe('PlayStep', () => {
	it('races Jev against the picked opponent and moves on to Reveal', async () => {
		const onReveal = vi.fn()
		const onOpponentChange = vi.fn()
		render(
			<PlayStep
				stages={[stage(jevRecording, [opusRecording, sonnetRecording])]}
				opponentIds={['claude-opus-5-5', 'claude-sonnet-5-5']}
				opponentId="claude-opus-5-5"
				onOpponentChange={onOpponentChange}
				onReveal={onReveal}
			/>
		)
		expect(screen.getByRole('button', { name: 'Start the race' })).toBeInTheDocument()
		expect(screen.getByRole('button', { name: /Opponent: Claude Opus 5.5/ })).toBeInTheDocument()
		await userEvent.click(screen.getByRole('button', { name: 'See the result' }))
		expect(onReveal).toHaveBeenCalledOnce()
	})

	it('says so plainly when the race has not been recorded', () => {
		render(
			<PlayStep
				stages={[stage(undefined, [])]}
				opponentIds={[]}
				opponentId={undefined}
				onOpponentChange={() => undefined}
				onReveal={() => undefined}
			/>
		)
		expect(screen.getByText(/has not been recorded yet/)).toBeInTheDocument()
		expect(screen.queryByRole('button', { name: 'Start the race' })).not.toBeInTheDocument()
	})
})
