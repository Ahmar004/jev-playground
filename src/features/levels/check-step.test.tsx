import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { levelSchema } from '@/content/level-schema'
import { testLevel } from '@/content/testing/levels'
import { CheckStep } from './check-step'
import type { LevelProgressView } from './level-progress'

const questions = levelSchema.parse(testLevel).check.questions
const first = questions[0]
if (!first) throw new Error('test level has no check question')
const only = [first]

function renderCheck(
	answers: LevelProgressView['answers'] = {},
	extra: { levelDone?: boolean; pendingQuestionId?: string | null } = {}
) {
	const onAnswer = vi.fn()
	const onBackToPath = vi.fn()
	render(
		<CheckStep
			questions={only}
			answers={answers}
			pendingQuestionId={extra.pendingQuestionId ?? null}
			levelDone={extra.levelDone ?? false}
			onAnswer={onAnswer}
			onBackToPath={onBackToPath}
		/>
	)
	return { onAnswer, onBackToPath }
}

describe('CheckStep', () => {
	it('keeps Check answer disabled until an option is picked', async () => {
		renderCheck()
		expect(screen.getByRole('heading', { level: 2, name: 'Check' })).toBeInTheDocument()
		const submit = screen.getByRole('button', { name: 'Check answer' })
		expect(submit).toBeDisabled()
		await userEvent.click(screen.getByRole('radio', { name: 'Option B' }))
		expect(submit).toBeEnabled()
	})

	it('submits the pick with Enter', async () => {
		const { onAnswer } = renderCheck()
		await userEvent.click(screen.getByRole('radio', { name: 'Option B' }))
		await userEvent.keyboard('{Enter}')
		expect(onAnswer).toHaveBeenCalledWith(first.id, 'b')
	})

	it('shows a stored wrong answer with the right one, the explanation and Try again', () => {
		renderCheck({ [first.id]: { optionId: 'b', correct: false } })
		expect(screen.getByText('Not quite')).toBeInTheDocument()
		expect(screen.getByText('The answer: Option A')).toBeInTheDocument()
		expect(screen.getByText('Because A.')).toBeInTheDocument()
		expect(screen.getByRole('button', { name: 'Try again' })).toHaveAttribute('type', 'button')
	})

	it('scores a retry locally, with the practice note, without calling onAnswer', async () => {
		const { onAnswer } = renderCheck({ [first.id]: { optionId: 'b', correct: false } })
		await userEvent.click(screen.getByRole('button', { name: 'Try again' }))
		expect(screen.getByRole('button', { name: 'Check answer' })).toBeDisabled()
		await userEvent.click(screen.getByRole('radio', { name: 'Option A' }))
		await userEvent.click(screen.getByRole('button', { name: 'Check answer' }))
		expect(onAnswer).not.toHaveBeenCalled()
		expect(screen.getByText('Right')).toBeInTheDocument()
		expect(
			screen.getByText('Practice only: your first answer is the one that counts.')
		).toBeInTheDocument()
	})

	it('shows a stored right answer with no Try again', () => {
		renderCheck({ [first.id]: { optionId: 'a', correct: true } })
		expect(screen.getByText('Right')).toBeInTheDocument()
		expect(screen.queryByRole('button', { name: 'Try again' })).not.toBeInTheDocument()
	})

	it('offers Back to Path, and Level complete only when the level is done', async () => {
		const answers = { [first.id]: { optionId: 'a', correct: true } }
		const { onBackToPath } = renderCheck(answers, { levelDone: true })
		expect(screen.getByText('Level complete')).toBeInTheDocument()
		await userEvent.click(screen.getByRole('button', { name: 'Back to Path' }))
		expect(onBackToPath).toHaveBeenCalled()
	})

	it('does not say Level complete while the Reveal is still to do', () => {
		renderCheck({ [first.id]: { optionId: 'a', correct: true } }, { levelDone: false })
		expect(screen.queryByText('Level complete')).not.toBeInTheDocument()
		expect(screen.getByRole('button', { name: 'Back to Path' })).toBeInTheDocument()
	})
})
