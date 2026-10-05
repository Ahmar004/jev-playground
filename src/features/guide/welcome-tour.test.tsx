import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { GUIDE_PART_LIST, GUIDE_PARTS, type GuidePart } from '@/lib/constants'
import { WELCOME_TOUR } from './guide'
import { stubLayout } from './testing/layout-stubs'

const push = vi.fn()
const toast = vi.fn()
const markGuideSeen = vi.fn()
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }))
vi.mock('@/lib/toast', () => ({ toast: (input: unknown) => toast(input) }))
vi.mock('@/lib/analytics/track', () => ({ trackFlowStep: vi.fn() }))
vi.mock('@/server/actions/guide', () => ({
	markGuideSeen: (input: unknown) => markGuideSeen(input),
	resetGuide: vi.fn()
}))

const { WelcomeTour } = await import('./welcome-tour')

const WELCOME = "Welcome to Jev's Playground"

function renderTour(seen: GuidePart[]) {
	return render(
		<QueryClientProvider client={new QueryClient()}>
			{WELCOME_TOUR.flatMap((step) => step.targets).map((target) => (
				<div key={target} data-guide={target}>
					{target}
				</div>
			))}
			<WelcomeTour seen={seen} startHref="/levels/speed-race" startLabel="Play level 1" />
		</QueryClientProvider>
	)
}

beforeEach(() => {
	vi.clearAllMocks()
	stubLayout()
	markGuideSeen.mockResolvedValue({ ok: true, data: { seen: [] } })
})

describe('WelcomeTour', () => {
	it('opens by itself for a new user, and Skip tour turns off the tour and the level tips', async () => {
		const user = userEvent.setup()
		renderTour([])
		expect(await screen.findByRole('dialog', { name: WELCOME })).toBeVisible()
		expect(screen.getByText(`1 of ${WELCOME_TOUR.length}`)).toBeVisible()
		await user.click(screen.getByRole('button', { name: 'Skip tour' }))
		expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
		expect(markGuideSeen).toHaveBeenCalledWith({ parts: [...GUIDE_PART_LIST] })
		expect(toast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Tour skipped' }))
	})

	it('stays closed for a user who has seen it, and the link opens it again', async () => {
		const user = userEvent.setup()
		renderTour([GUIDE_PARTS.welcome])
		expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
		await user.click(screen.getByRole('button', { name: 'Take a guide tour' }))
		expect(await screen.findByRole('dialog', { name: WELCOME })).toBeVisible()
	})

	it('steps forward and back, and the last step opens level 1', async () => {
		const user = userEvent.setup()
		renderTour([])
		await user.click(await screen.findByRole('button', { name: 'Show me around' }))
		expect(await screen.findByRole('dialog', { name: 'Beginner mode needs no keys' })).toBeVisible()
		await user.click(screen.getByRole('button', { name: 'Back' }))
		expect(await screen.findByRole('dialog', { name: WELCOME })).toBeVisible()
		await user.click(screen.getByRole('button', { name: 'Show me around' }))
		for (let step = 1; step < WELCOME_TOUR.length - 1; step++) {
			await user.click(await screen.findByRole('button', { name: 'Next' }))
		}
		await user.click(await screen.findByRole('button', { name: 'Play level 1' }))
		expect(markGuideSeen).toHaveBeenCalledWith({ parts: [GUIDE_PARTS.welcome] })
		expect(push).toHaveBeenCalledWith('/levels/speed-race')
	})

	it('Esc skips the tour', async () => {
		const user = userEvent.setup()
		renderTour([])
		await screen.findByRole('dialog')
		await user.keyboard('{Escape}')
		await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
		expect(markGuideSeen).toHaveBeenCalledWith({ parts: [...GUIDE_PART_LIST] })
	})
})
