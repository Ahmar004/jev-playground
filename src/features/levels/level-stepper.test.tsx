import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { levelSchema } from '@/content/level-schema'
import { testLevel } from '@/content/testing/levels'
import { jevRecording, opusRecording } from '@/features/race/testing/recordings'
import { choiceTask } from '@/runner/testing/tasks'

const push = vi.fn()
let search = new URLSearchParams()

vi.mock('next/navigation', () => ({
	useRouter: () => ({ push }),
	usePathname: () => '/levels/test-level',
	useSearchParams: () => search
}))
vi.mock('canvas-confetti', () => ({ default: vi.fn() }))

const { LevelStepper } = await import('./level-stepper')
const level = levelSchema.parse(testLevel)

function radioAt(name: string, index: number): HTMLElement {
	const radio = screen.getAllByRole('radio', { name })[index]
	if (!radio) throw new Error(`No radio "${name}" at index ${index}`)
	return radio
}

function renderStepper() {
	return render(
		<LevelStepper level={level} task={choiceTask} recordings={[jevRecording, opusRecording]} />
	)
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
		rerender(
			<LevelStepper level={level} task={choiceTask} recordings={[jevRecording, opusRecording]} />
		)
		expect(screen.getByRole('list', { name: 'Your prediction' })).toHaveTextContent('You got it')
	})
})
