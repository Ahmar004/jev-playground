import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { GUIDE_PARTS, LEVEL_STEPS, type GuidePart, type LevelStep } from '@/lib/constants'
import { stubLayout } from './testing/layout-stubs'

const markGuideSeen = vi.fn()
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }))
vi.mock('@/lib/toast', () => ({ toast: vi.fn() }))
vi.mock('@/server/actions/guide', () => ({
	markGuideSeen: (input: unknown) => markGuideSeen(input),
	resetGuide: vi.fn()
}))

const { LevelTips } = await import('./level-tips')

const client = new QueryClient()

function tips(step: LevelStep, seen: GuidePart[], target?: string) {
	return (
		<QueryClientProvider client={client}>
			{target && <div data-guide={target}>target</div>}
			<LevelTips step={step} seen={seen} />
		</QueryClientProvider>
	)
}

beforeEach(() => {
	vi.clearAllMocks()
	stubLayout()
	markGuideSeen.mockResolvedValue({ ok: true, data: { seen: [] } })
})

describe('LevelTips', () => {
	it('shows the Predict tip once, and Got it saves it', async () => {
		const user = userEvent.setup()
		render(tips(LEVEL_STEPS.predict, [], 'predict'))
		expect(await screen.findByRole('dialog', { name: 'Make your guess first' })).toBeVisible()
		await user.click(screen.getByRole('button', { name: 'Got it' }))
		expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
		expect(markGuideSeen).toHaveBeenCalledWith({ parts: [GUIDE_PARTS.predict] })
	})

	it('waits for "See every item" before showing the Reveal tip', async () => {
		const view = render(tips(LEVEL_STEPS.reveal, []))
		expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
		view.rerender(tips(LEVEL_STEPS.reveal, [], 'item-results'))
		expect(await screen.findByRole('dialog', { name: 'See every item' })).toBeVisible()
	})

	it('shows nothing on a tab without a tip, or for a tip already seen', async () => {
		render(tips(LEVEL_STEPS.learn, [], 'predict'))
		render(tips(LEVEL_STEPS.check, [GUIDE_PARTS.check], 'check'))
		await new Promise((resolve) => requestAnimationFrame(resolve))
		expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
	})

	it('Turn off tips saves every level tip as seen', async () => {
		const user = userEvent.setup()
		render(tips(LEVEL_STEPS.check, [], 'check'))
		await user.click(await screen.findByRole('button', { name: 'Turn off tips' }))
		expect(markGuideSeen).toHaveBeenCalledWith({
			parts: [GUIDE_PARTS.predict, GUIDE_PARTS.reveal, GUIDE_PARTS.check]
		})
	})
})
