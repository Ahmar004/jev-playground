import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { levelSchema } from '@/content/level-schema'
import { testLevel } from '@/content/testing/levels'
import { jevRecording, opusRecording } from '@/features/race/testing/recordings'
import { choiceTask } from '@/runner/testing/tasks'
import { GUIDE_PART_LIST } from '@/lib/constants'
import type { LevelProgressView } from './level-progress'

const push = vi.fn()
let search = new URLSearchParams()

vi.mock('next/navigation', () => ({
	useRouter: () => ({ push }),
	usePathname: () => '/levels/test-level',
	useSearchParams: () => search
}))
const confetti = vi.fn()
vi.mock('canvas-confetti', () => ({ default: (options: unknown) => confetti(options) }))
vi.mock('@/lib/toast', () => ({ toast: vi.fn() }))
vi.mock('@/lib/analytics/track', () => ({ track: vi.fn() }))
vi.mock('@/server/actions/guide', () => ({ markGuideSeen: vi.fn(), resetGuide: vi.fn() }))
vi.mock('@/server/actions/progress', () => ({
	submitPrediction: vi.fn().mockResolvedValue({ ok: true, data: { saved: true } }),
	submitCheck: vi.fn(),
	revealPrediction: vi.fn().mockResolvedValue({
		ok: true,
		data: {
			firstReveal: true,
			predictionCorrect: true,
			awards: { xp: 0, badges: [] },
			levelDone: false
		}
	})
}))

const { LevelStepper } = await import('./level-stepper')
const level = levelSchema.parse(testLevel)

function radioAt(name: string, index: number): HTMLElement {
	const radio = screen.getAllByRole('radio', { name })[index]
	if (!radio) throw new Error(`No radio "${name}" at index ${index}`)
	return radio
}

const freshProgress: LevelProgressView = {
	status: null,
	prediction: {},
	revealed: false,
	opponentModelId: null,
	predictionCorrect: null,
	answers: {}
}

const client = new QueryClient()

function stepper(initialProgress: LevelProgressView = freshProgress) {
	return (
		<QueryClientProvider client={client}>
			<LevelStepper
				level={level}
				tasks={[choiceTask]}
				recordings={[jevRecording, opusRecording]}
				initialProgress={initialProgress}
				guideSeen={[...GUIDE_PART_LIST]}
			/>
		</QueryClientProvider>
	)
}

function renderStepper(initialProgress?: LevelProgressView) {
	return render(stepper(initialProgress))
}

beforeEach(() => {
	push.mockClear()
	search = new URLSearchParams()
})

describe('LevelStepper', () => {
	it('opens on Learn with the level title, the Beginner mode banner and every step', async () => {
		renderStepper()
		expect(screen.getByRole('heading', { level: 1, name: 'Test Race' })).toBeInTheDocument()
		expect(screen.getByText(/replay of real recorded runs/)).toBeInTheDocument()
		const nav = screen.getByRole('navigation', { name: 'Level steps' })
		expect(nav).toHaveTextContent('Learn')
		expect(nav).toHaveTextContent('Reveal')
		expect(screen.getByRole('button', { name: /1\. Learn/ })).toHaveAttribute(
			'aria-current',
			'step'
		)
		expect(screen.getByText('Two racers sort the same tickets.')).toBeInTheDocument()
		await userEvent.click(screen.getByRole('button', { name: 'Make your prediction' }))
		expect(push).toHaveBeenCalledWith('/levels/test-level?step=predict')
	})

	it('lets any step be opened from the step list (no step is locked)', async () => {
		renderStepper()
		await userEvent.click(screen.getByRole('button', { name: /4\. Reveal/ }))
		expect(push).toHaveBeenCalledWith('/levels/test-level?step=reveal')
	})

	it('carries the prediction into Reveal', async () => {
		search = new URLSearchParams('step=predict')
		const { rerender } = renderStepper()
		await userEvent.click(radioAt('Jev', 0))
		await userEvent.click(radioAt('Jev', 1))
		await userEvent.click(radioAt('LLM', 2))
		await userEvent.click(screen.getByRole('button', { name: 'Lock in my prediction' }))
		expect(push).toHaveBeenCalledWith('/levels/test-level?step=play')

		search = new URLSearchParams('step=reveal')
		rerender(stepper())
		expect(screen.getByRole('list', { name: 'Your prediction' })).toHaveTextContent('You got it')
	})

	it('fires confetti once: not again when returning to Reveal', async () => {
		confetti.mockReset()
		search = new URLSearchParams('step=reveal')
		const { rerender } = renderStepper()
		await waitFor(() => expect(confetti).toHaveBeenCalledTimes(1))
		search = new URLSearchParams('step=check')
		rerender(stepper())
		search = new URLSearchParams('step=reveal')
		rerender(stepper())
		await new Promise((resolve) => setTimeout(resolve, 30))
		expect(confetti).toHaveBeenCalledTimes(1)
	})

	it('lists all five steps', () => {
		renderStepper()
		const nav = screen.getByRole('navigation', { name: 'Level steps' })
		expect(nav).toHaveTextContent('5. Check')
		expect(screen.getAllByRole('button', { name: /^\d\. / })).toHaveLength(5)
	})

	it('starts Predict from the saved prediction', () => {
		search = new URLSearchParams('step=predict')
		renderStepper({ ...freshProgress, prediction: { fastest: 'jev' } })
		expect(radioAt('Jev', 0)).toBeChecked()
	})

	it('shows the Check step from ?step=check', () => {
		search = new URLSearchParams('step=check')
		renderStepper()
		expect(screen.getByRole('heading', { level: 2, name: 'Check' })).toBeInTheDocument()
		expect(screen.getAllByRole('button', { name: 'Check answer' })).toHaveLength(2)
	})

	it('moves focus to the new step heading, but not on first load', () => {
		const { rerender } = renderStepper()
		expect(document.body).toHaveFocus()
		search = new URLSearchParams('step=predict')
		rerender(stepper())
		expect(screen.getByRole('heading', { level: 2, name: 'Predict' })).toHaveFocus()
	})
})
