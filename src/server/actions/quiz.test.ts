import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getQuiz } from '@/content/quizzes'
import { BADGES, QUIZ_IDS, XP_AMOUNTS, XP_SOURCES } from '@/lib/constants'
import { submitQuiz } from './quiz'

const USER_ID = '3f2a4c1e-0b7d-4e55-9a10-2c6f1d8e9b42'

const state = vi.hoisted(() => ({
	attemptFind: vi.fn(),
	attemptUpsert: vi.fn(),
	attemptRows: vi.fn(),
	xpCreate: vi.fn(),
	xpDelete: vi.fn(),
	badgeDelete: vi.fn(),
	refresh: vi.fn()
}))

vi.mock('@/server/db/client', () => ({
	db: {
		$transaction: async (run: (tx: unknown) => Promise<unknown>) =>
			run({
				quizAttempt: {
					findUnique: state.attemptFind,
					upsert: state.attemptUpsert,
					findMany: state.attemptRows
				},
				xpEvent: { createMany: state.xpCreate, deleteMany: state.xpDelete },
				levelProgress: { findMany: async () => [], count: async () => 0 },
				leaderboardEntry: { findMany: async () => [] },
				userBadge: { createMany: async () => ({ count: 0 }), deleteMany: state.badgeDelete }
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
	state.attemptFind.mockResolvedValue(null)
	state.attemptUpsert.mockResolvedValue({})
	state.attemptRows.mockResolvedValue([])
	state.xpCreate.mockResolvedValue({ count: 1 })
	state.xpDelete.mockResolvedValue({ count: 0 })
	state.badgeDelete.mockResolvedValue({ count: 0 })
})

describe('submitQuiz', () => {
	it('scores on the server, stores the attempt and pays XP per right answer', async () => {
		const result = await submitQuiz({ quizId: QUIZ_IDS.start, answers: picks(2) })
		expect(result.ok).toBe(true)
		if (!result.ok) return
		const right = quiz.questions.length - 2
		expect(result.data).toMatchObject({ score: right, firstAttempt: true, xpLost: 0 })
		expect(result.data.awards.xp).toBe(right * XP_AMOUNTS[XP_SOURCES.quizCorrect])
		expect(state.attemptUpsert.mock.calls[0]?.[0].create).toMatchObject({
			userId: USER_ID,
			quizId: QUIZ_IDS.start,
			score: right
		})
		expect(state.refresh).toHaveBeenCalled()
	})

	it('lets a retry replace the attempt and takes back the XP of answers now wrong', async () => {
		state.attemptFind.mockResolvedValue({ score: quiz.questions.length })
		state.xpCreate.mockResolvedValue({ count: 0 })
		state.xpDelete.mockResolvedValue({ count: 3 })
		const result = await submitQuiz({ quizId: QUIZ_IDS.start, answers: picks(3) })
		expect(result.ok).toBe(true)
		if (!result.ok) return
		expect(result.data).toMatchObject({
			firstAttempt: false,
			score: quiz.questions.length - 3,
			xpLost: 3 * XP_AMOUNTS[XP_SOURCES.quizCorrect]
		})
		expect(state.attemptUpsert.mock.calls[0]?.[0].update).toMatchObject({
			score: quiz.questions.length - 3
		})
		const where = state.xpDelete.mock.calls[0]?.[0].where
		expect(where.sourceId.startsWith).toBe(`${QUIZ_IDS.start}:`)
		expect(where.sourceId.notIn).toHaveLength(quiz.questions.length - 3)
	})

	it('takes back the quiz climber badge when a retry no longer earns it', async () => {
		state.attemptFind.mockResolvedValue({ score: 5 })
		state.attemptRows.mockResolvedValue([
			{ quizId: QUIZ_IDS.start, score: quiz.questions.length },
			{ quizId: QUIZ_IDS.end, score: 4 }
		])
		await submitQuiz({ quizId: QUIZ_IDS.start, answers: picks(0) })
		expect(state.badgeDelete).toHaveBeenCalledWith({
			where: { userId: USER_ID, badgeId: { in: [BADGES.quizClimber] } }
		})
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
		expect(state.attemptUpsert).not.toHaveBeenCalled()
	})
})
