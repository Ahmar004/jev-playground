import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { LEVELS } from '@/content/levels'
import { currentRecordings } from '@/content/recordings'
import { getTask } from '@/content/tasks'
import type { ItemResult } from '@/runner/types'
import { levelStages } from '../lineup'
import { RouterReveal } from './router-reveal'

const level = LEVELS.get('the-router')
if (!level?.router) throw new Error('no router level')
const cards = level.router
const tasks = level.tasks.map((entry) => getTask(entry.id))
const stages = levelStages(
	level,
	tasks,
	tasks.flatMap((task) => currentRecordings(task.id))
)

function liveResult(itemId: string): ItemResult {
	return {
		itemId,
		ok: true,
		raw: 'the live answer',
		parsed: 'the live answer',
		credit: 1,
		correct: true,
		latencyMs: 12,
		usage: { inputTokens: 1, outputTokens: 1 },
		costUsd: 0
	}
}

function renderReveal(liveRun: React.ComponentProps<typeof RouterReveal>['liveRun']) {
	render(
		<RouterReveal
			cards={cards}
			stages={stages}
			assignments={{}}
			codeResults={{}}
			opponentId="claude-opus-5-5"
			liveRun={liveRun}
		/>
	)
}

describe('RouterReveal', () => {
	it('shows only the recorded results before any live run', () => {
		renderReveal(null)
		expect(screen.getAllByRole('list', { name: /for each card/ })).toHaveLength(1)
		expect(screen.queryByText(/Developer mode/)).not.toBeInTheDocument()
	})

	it('shows the live run above the recorded results, each with its own label', () => {
		const results = Object.fromEntries(
			stages.map((stage) => [
				stage.task.id,
				{
					jev: liveResult(stage.task.items[0]?.id ?? ''),
					llm: liveResult(stage.task.items[0]?.id ?? '')
				}
			])
		)
		renderReveal({
			results,
			startedAt: '2026-10-04T14:02:00.000Z',
			jevModelId: 'jev-1.13.0',
			llmModelId: 'gpt-x'
		})
		const live = screen.getByRole('list', { name: 'Your live run, for each card' })
		const recorded = screen.getByRole('list', { name: 'Recorded runs, for each card' })
		expect(within(live).getAllByText(/^Developer mode - run .+ - gpt-x$/)).toHaveLength(
			cards.length
		)
		expect(within(live).getAllByText('the live answer')).toHaveLength(cards.length * 2)
		expect(within(live).queryByText(/Beginner mode/)).not.toBeInTheDocument()
		expect(
			within(recorded).getAllByText(/^Beginner mode - recorded .+ - claude-opus-5-5$/)
		).toHaveLength(cards.length)
		expect(within(recorded).queryByText(/Developer mode/)).not.toBeInTheDocument()
	})
})
