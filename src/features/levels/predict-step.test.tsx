import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { levelSchema } from '@/content/level-schema'
import { testLevel } from '@/content/testing/levels'
import { PredictStep } from './predict-step'

const { intro: INTRO, questions } = levelSchema.parse(testLevel).predict

function radioAt(name: string, index: number): HTMLElement {
	const radio = screen.getAllByRole('radio', { name })[index]
	if (!radio) throw new Error(`No radio "${name}" at index ${index}`)
	return radio
}

describe('PredictStep', () => {
	it('locks in one pick per question with the button', async () => {
		const onSubmit = vi.fn()
		render(<PredictStep intro={INTRO} questions={questions} initial={{}} onSubmit={onSubmit} />)
		const submit = screen.getByRole('button', { name: 'Lock in my prediction' })
		expect(submit).toBeDisabled()

		expect(screen.getByText(INTRO)).toBeInTheDocument()
		expect(screen.getAllByRole('group')).toHaveLength(3)
		await userEvent.click(radioAt('Jev', 0))
		await userEvent.click(radioAt('LLM', 1))
		await userEvent.click(radioAt('Jev', 2))
		await userEvent.click(submit)
		expect(onSubmit).toHaveBeenCalledWith({ fastest: 'jev', cheapest: 'llm', most_accurate: 'jev' })
	})

	it('submits a complete prediction with Enter on a focused radio', async () => {
		const onSubmit = vi.fn()
		render(<PredictStep intro={INTRO} questions={questions} initial={{}} onSubmit={onSubmit} />)
		await userEvent.click(radioAt('Jev', 0))
		await userEvent.click(radioAt('LLM', 1))
		await userEvent.click(radioAt('Jev', 2))
		radioAt('Jev', 2).focus()
		await userEvent.keyboard('{Enter}')
		expect(onSubmit).toHaveBeenCalledWith({ fastest: 'jev', cheapest: 'llm', most_accurate: 'jev' })
	})

	it('does not submit an incomplete prediction', async () => {
		const onSubmit = vi.fn()
		render(<PredictStep intro={INTRO} questions={questions} initial={{}} onSubmit={onSubmit} />)
		await userEvent.click(radioAt('Jev', 0))
		radioAt('Jev', 0).focus()
		await userEvent.keyboard('{Enter}')
		expect(onSubmit).not.toHaveBeenCalled()
	})

	it('starts from an earlier prediction', () => {
		render(
			<PredictStep
				intro={INTRO}
				questions={questions}
				initial={{ fastest: 'llm' }}
				onSubmit={() => undefined}
			/>
		)
		expect(radioAt('LLM', 0)).toBeChecked()
	})

	it('shows the picks but cannot change them once locked', async () => {
		const onSubmit = vi.fn()
		const picks = { fastest: 'jev', cheapest: 'llm', most_accurate: 'jev' } as const
		render(
			<PredictStep intro={INTRO} questions={questions} initial={picks} locked onSubmit={onSubmit} />
		)
		expect(radioAt('Jev', 0)).toBeChecked()
		expect(radioAt('Jev', 0)).toBeDisabled()
		await userEvent.click(screen.getByRole('button', { name: 'Back to the race' }))
		expect(onSubmit).toHaveBeenCalledWith(picks)
	})
})
