import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getQuiz } from '@/content/quizzes'
import { QUIZ_IDS, XP_AMOUNTS, XP_SOURCES } from '@/lib/constants'
import { submitQuiz } from './quiz'

const USER_ID = '3f2a4c1e-0b7d-4e55-9a10-2c6f1d8e9b42'

const state = vi.hoisted(() => ({
	attemptCreate: vi.fn(),
	xpCreate: vi.fn(),
	refresh: vi.fn()
}))

vi.mock('@/server/db/client', () => ({
	db: {
		$transaction: async (run: (tx: unknown) => Promise<unknown>) =>
			run({
				quizAttempt: { createMany: state.attemptCreate, findMany: async () => [] },
				xpEvent: { createMany: state.xpCreate },
				levelProgress: { findMany: async () => [], count: async () => 0 },
				leaderboardEntry: { findMany: async () => [] },
				userBadge: { createMany: async () => ({ count: 0 }) }
			})
	}
}))
vi.mock('@/server/auth/session', () => ({
	requireUser: async () => ({ userId: USER_ID, email: 'ada@example.com' })
}))
vi.mock('next/cache', () => ({ refresh: state.refresh }))
vi.mock('next/navigation', () => ({ unstable_rethrow: () => {} }))
vi.mock('@/lib/observability/capture-error', () => ({
	captureError: (error: { userMessage?: string; status?: number }) => ({
		userMessage: error.userMessage ?? 'Something went wrong. Please try again.',
		status: error.status ?? 500
	})
}))

const quiz = getQuiz(QUIZ_IDS.start)
const picks = (wrong: number) =>
	Object.fromEntries(
		quiz.questions.map((question, index) => [
			question.id,
			index < wrong ? (question.answer === 'jev' ? 'llm' : 'jev') : question.answer
		])
	)

beforeEach(() => {
	vi.clearAllMocks()
	state.attemptCreate.mockResolvedValue({ count: 1 })
	state.xpCreate.mockResolvedValue({ count: 1 })
})

describe('submitQuiz', () => {
	it('scores on the server, stores the attempt and pays XP per right answer', async () => {
		const result = await submitQuiz({ quizId: QUIZ_IDS.start, answers: picks(2) })
		expect(result.ok).toBe(true)
		if (!result.ok) return
		const right = quiz.questions.length - 2
		expect(result.data).toMatchObject({ score: right, firstAttempt: true })
		expect(result.data.awards.xp).toBe(right * XP_AMOUNTS[XP_SOURCES.quizCorrect])
		expect(state.attemptCreate.mock.calls[0]?.[0].data[0]).toMatchObject({
			userId: USER_ID,
			quizId: QUIZ_IDS.start,
			score: right
		})
		expect(state.refresh).toHaveBeenCalled()
	})

	it('awards nothing on a repeat submit', async () => {
		state.attemptCreate.mockResolvedValue({ count: 0 })
		const result = await submitQuiz({ quizId: QUIZ_IDS.start, answers: picks(0) })
		expect(result.ok && result.data.awards.xp).toBe(0)
		expect(state.xpCreate).not.toHaveBeenCalled()
	})

	it('rejects a partial quiz and an unknown tool', async () => {
		const partial = picks(0)
		delete partial[quiz.questions[0]!.id]
		const incomplete = await submitQuiz({ quizId: QUIZ_IDS.start, answers: partial })
		expect(incomplete.ok).toBe(false)
		const bad = await submitQuiz({
			quizId: QUIZ_IDS.start,
			answers: { ...picks(0), [quiz.questions[0]!.id]: 'oracle' }
		})
		expect(bad.ok).toBe(false)
		expect(state.attemptCreate).not.toHaveBeenCalled()
	})
})
