import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getLevel } from '@/content/levels'
import { LEVEL_STATUS } from '@/lib/constants'
import type { LevelProgressView } from './level-progress'

const submitPrediction = vi.fn()
const revealPrediction = vi.fn()
const submitCheck = vi.fn()
const toast = vi.fn()
const track = vi.fn()

vi.mock('@/server/actions/progress', () => ({
	submitPrediction: (input: unknown) => submitPrediction(input),
	revealPrediction: (input: unknown) => revealPrediction(input),
	submitCheck: (input: unknown) => submitCheck(input)
}))
vi.mock('@/lib/toast', () => ({ toast: (input: unknown) => toast(input) }))
vi.mock('@/lib/analytics/track', () => ({
	track: (event: string, props: unknown) => track(event, props)
}))

const { useLevelProgress } = await import('./use-level-progress')
const { announceAwards } = await import('./awards-toast')

const LEVEL_ID = 'speed-race'
const QUESTION_ID = 'speed-race-tool-fit'
const RIGHT_OPTION = 'jev'
const WRONG_OPTION = 'code'
const QUESTIONS = getLevel(LEVEL_ID)?.check.questions ?? []
const NO_AWARDS = { xp: 0, badges: [] }

const fresh: LevelProgressView = {
	status: null,
	prediction: {},
	revealed: false,
	opponentModelId: null,
	predictionCorrect: null,
	answers: {}
}

function render(initial: LevelProgressView = fresh) {
	const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } })
	const wrapper = ({ children }: { children: ReactNode }) => (
		<QueryClientProvider client={client}>{children}</QueryClientProvider>
	)
	return renderHook(() => useLevelProgress(LEVEL_ID, initial, QUESTIONS), { wrapper })
}

beforeEach(() => {
	submitPrediction.mockReset()
	revealPrediction.mockReset()
	submitCheck.mockReset()
	toast.mockReset()
	track.mockReset()
})

describe('useLevelProgress lockIn', () => {
	it('applies the prediction at once and tracks the level start', async () => {
		submitPrediction.mockResolvedValue({ ok: true, data: { saved: true } })
		const { result } = render()
		act(() => result.current.lockIn({ fastest: 'jev' }))
		expect(result.current.progress.prediction).toEqual({ fastest: 'jev' })
		expect(result.current.progress.status).toBe(LEVEL_STATUS.inProgress)
		await waitFor(() =>
			expect(track).toHaveBeenCalledWith('prediction_made', { level_id: LEVEL_ID })
		)
		expect(track).toHaveBeenCalledWith('level_started', { level_id: LEVEL_ID })
		expect(submitPrediction).toHaveBeenCalledWith({
			levelId: LEVEL_ID,
			prediction: { fastest: 'jev' }
		})
	})

	it('rolls back and shows a destructive toast when the save fails', async () => {
		submitPrediction.mockResolvedValue({ ok: false, error: 'Nope', status: 500 })
		const { result } = render()
		act(() => result.current.lockIn({ fastest: 'jev' }))
		await waitFor(() => expect(toast).toHaveBeenCalled())
		expect(toast).toHaveBeenCalledWith({
			title: "Couldn't save your progress",
			description: 'Nope',
			variant: 'destructive'
		})
		expect(result.current.progress).toEqual(fresh)
		expect(track).not.toHaveBeenCalled()
	})
})

describe('useLevelProgress reveal', () => {
	it('does not call the server when already revealed', () => {
		const { result } = render({ ...fresh, revealed: true, opponentModelId: 'm' })
		act(() => result.current.reveal('m'))
		expect(revealPrediction).not.toHaveBeenCalled()
		expect(result.current.celebrate).toBe(false)
	})

	it('celebrates only a correct first reveal', async () => {
		revealPrediction.mockResolvedValue({
			ok: true,
			data: { firstReveal: true, predictionCorrect: true, awards: NO_AWARDS, levelDone: false }
		})
		const { result } = render()
		act(() => result.current.reveal('opus'))
		await waitFor(() => expect(result.current.celebrate).toBe(true))
		expect(result.current.progress).toMatchObject({
			revealed: true,
			predictionCorrect: true,
			opponentModelId: 'opus'
		})
	})

	it('does not celebrate a wrong first reveal', async () => {
		revealPrediction.mockResolvedValue({
			ok: true,
			data: { firstReveal: true, predictionCorrect: false, awards: NO_AWARDS, levelDone: false }
		})
		const { result } = render()
		act(() => result.current.reveal('opus'))
		await waitFor(() => expect(result.current.progress.revealed).toBe(true))
		expect(result.current.celebrate).toBe(false)
	})

	it('marks the level done and tracks completion', async () => {
		revealPrediction.mockResolvedValue({
			ok: true,
			data: { firstReveal: true, predictionCorrect: false, awards: NO_AWARDS, levelDone: true }
		})
		const { result } = render()
		act(() => result.current.reveal('opus'))
		await waitFor(() => expect(result.current.progress.status).toBe(LEVEL_STATUS.done))
		expect(track).toHaveBeenCalledWith('level_completed', { level_id: LEVEL_ID })
	})

	it('announces awards from the result', async () => {
		revealPrediction.mockResolvedValue({
			ok: true,
			data: {
				firstReveal: true,
				predictionCorrect: true,
				awards: { xp: 25, badges: [] },
				levelDone: false
			}
		})
		const { result } = render()
		act(() => result.current.reveal('opus'))
		await waitFor(() => expect(toast).toHaveBeenCalledWith({ title: '+25 XP' }))
	})
})

describe('useLevelProgress celebration', () => {
	it('is cleared once consumed', async () => {
		revealPrediction.mockResolvedValue({
			ok: true,
			data: { firstReveal: true, predictionCorrect: true, awards: NO_AWARDS, levelDone: false }
		})
		const { result } = render()
		act(() => result.current.reveal('opus'))
		await waitFor(() => expect(result.current.celebrate).toBe(true))
		act(() => result.current.consumeCelebration())
		expect(result.current.celebrate).toBe(false)
	})
})

describe('useLevelProgress answer', () => {
	it('ignores a question that already has a stored answer', () => {
		const stored = { [QUESTION_ID]: { optionId: WRONG_OPTION, correct: false } }
		const { result } = render({ ...fresh, answers: stored })
		act(() => result.current.answer(QUESTION_ID, RIGHT_OPTION))
		expect(submitCheck).not.toHaveBeenCalled()
		expect(result.current.progress.answers).toEqual(stored)
	})

	it('stores the answer at once and clears pending when the server replies', async () => {
		let release: (value: unknown) => void = () => undefined
		submitCheck.mockReturnValue(
			new Promise((resolve) => {
				release = resolve
			})
		)
		const { result } = render()
		act(() => result.current.answer(QUESTION_ID, WRONG_OPTION))
		expect(result.current.pendingQuestionId).toBe(QUESTION_ID)
		expect(result.current.progress.answers[QUESTION_ID]).toEqual({
			optionId: WRONG_OPTION,
			correct: false
		})
		await act(async () => {
			release({
				ok: true,
				data: {
					firstAnswer: true,
					correct: false,
					stored: { optionId: WRONG_OPTION, correct: false },
					awards: NO_AWARDS,
					levelDone: false
				}
			})
		})
		await waitFor(() => expect(result.current.pendingQuestionId).toBeNull())
	})

	it('rolls back a failed answer', async () => {
		submitCheck.mockResolvedValue({ ok: false, error: 'Down', status: 500 })
		const { result } = render()
		act(() => result.current.answer(QUESTION_ID, WRONG_OPTION))
		await waitFor(() => expect(toast).toHaveBeenCalled())
		expect(result.current.progress.answers).toEqual({})
	})

	it('marks the level done on completion', async () => {
		submitCheck.mockResolvedValue({
			ok: true,
			data: {
				firstAnswer: true,
				correct: true,
				stored: { optionId: RIGHT_OPTION, correct: true },
				awards: NO_AWARDS,
				levelDone: true
			}
		})
		const { result } = render()
		act(() => result.current.answer(QUESTION_ID, RIGHT_OPTION))
		await waitFor(() => expect(result.current.progress.status).toBe(LEVEL_STATUS.done))
		expect(track).toHaveBeenCalledWith('level_completed', { level_id: LEVEL_ID })
	})
})

describe('announceAwards', () => {
	it('toasts the XP and one toast per new badge', () => {
		announceAwards({ xp: 25, badges: ['first_race'] })
		expect(toast).toHaveBeenCalledWith({ title: '+25 XP' })
		expect(toast).toHaveBeenCalledWith({ title: 'Badge earned: First Race' })
		expect(toast).toHaveBeenCalledTimes(2)
	})

	it('says nothing when nothing was earned', () => {
		announceAwards({ xp: 0, badges: [] })
		expect(toast).not.toHaveBeenCalled()
	})
})
