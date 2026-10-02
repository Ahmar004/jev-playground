import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getCheckQuestion } from '@/content/levels'
import { AppError } from '@/lib/errors/app-error'
import {
	BADGES,
	CLAUDE_MODELS,
	LEVEL_STATUS,
	PREDICTION_METRICS,
	RACERS,
	XP_AMOUNTS,
	XP_SOURCES
} from '@/lib/constants'
import { createFakeProgressDb } from '@/server/testing/fake-progress-db'

const USER_ID = '3f2a4c1e-0b7d-4e55-9a10-2c6f1d8e9b42'
const LEVEL = 'speed-race'
const Q_TOOL = 'speed-race-tool-fit'
const Q_COST = 'speed-race-llm-cost'
const OPUS = CLAUDE_MODELS.opus

const state = vi.hoisted(() => ({
	signedIn: true,
	fake: undefined as unknown,
	refresh: vi.fn()
}))
vi.mock('@/server/db/client', () => ({
	db: new Proxy({}, { get: (_target, key) => (state.fake as Record<PropertyKey, unknown>)[key] })
}))
vi.mock('@/server/auth/session', () => ({
	requireUser: async () => {
		if (!state.signedIn) {
			const { AppError: Unauthorized } = await import('@/lib/errors/app-error')
			throw new Unauthorized('Please sign in to continue.', {
				status: 401,
				code: 'unauthenticated'
			})
		}
		return { userId: USER_ID, email: 'ada@example.com' }
	}
}))
vi.mock('next/cache', () => ({ refresh: state.refresh }))
vi.mock('next/navigation', () => ({ unstable_rethrow: () => {} }))
vi.mock('@/lib/observability/capture-error', () => ({
	captureError: (error: { userMessage?: string; status?: number }) => ({
		userMessage: error.userMessage ?? 'Something went wrong. Please try again.',
		status: error.status ?? 500
	})
}))

const { revealPrediction, setLevelStatus, submitCheck, submitPrediction } =
	await import('./progress')

let fake: ReturnType<typeof createFakeProgressDb>

beforeEach(() => {
	vi.clearAllMocks()
	state.signedIn = true
	fake = createFakeProgressDb()
	state.fake = fake.db
})

// Jev is faster and cheaper than Opus; accuracy ties, so only the first two decide.
const RIGHT_PICKS = {
	[PREDICTION_METRICS.fastest]: RACERS.jev,
	[PREDICTION_METRICS.cheapest]: RACERS.jev,
	[PREDICTION_METRICS.mostAccurate]: RACERS.llm
}

function answerOf(questionId: string): string {
	return getCheckQuestion(questionId)?.question.answerId ?? ''
}

describe('signed out', () => {
	it('returns 401 from every action without touching the database', async () => {
		state.signedIn = false
		const results = await Promise.all([
			setLevelStatus({ levelId: LEVEL, status: LEVEL_STATUS.skipped }),
			submitPrediction({ levelId: LEVEL, prediction: RIGHT_PICKS }),
			revealPrediction({ levelId: LEVEL, opponentModelId: OPUS }),
			submitCheck({ levelId: LEVEL, questionId: Q_TOOL, optionId: 'jev' })
		])
		for (const result of results) expect(result).toMatchObject({ ok: false, status: 401 })
		expect(fake.db.$transaction).not.toHaveBeenCalled()
		expect(state.refresh).not.toHaveBeenCalled()
	})
})

describe('input checks', () => {
	it('rejects a client-given user id and never writes', async () => {
		const result = await submitCheck({
			levelId: LEVEL,
			questionId: Q_TOOL,
			optionId: 'jev',
			userId: 'attacker'
		})
		expect(result).toMatchObject({ ok: false, status: 400 })
		expect(fake.db.$transaction).not.toHaveBeenCalled()
	})

	it('answers 404 for an unknown level', async () => {
		const results = await Promise.all([
			setLevelStatus({ levelId: 'nope', status: LEVEL_STATUS.skipped }),
			submitPrediction({ levelId: 'nope', prediction: {} }),
			revealPrediction({ levelId: 'nope', opponentModelId: OPUS }),
			submitCheck({ levelId: 'nope', questionId: Q_TOOL, optionId: 'jev' })
		])
		for (const result of results) expect(result).toMatchObject({ ok: false, status: 404 })
		expect(state.refresh).not.toHaveBeenCalled()
	})

	it('rejects a status other than skipped', async () => {
		const result = await setLevelStatus({ levelId: LEVEL, status: LEVEL_STATUS.done })
		expect(result).toMatchObject({ ok: false, status: 400 })
	})

	it('rejects an unknown metric, question, option and opponent with 400', async () => {
		const results = await Promise.all([
			submitPrediction({ levelId: LEVEL, prediction: { bravest: RACERS.jev } }),
			submitCheck({ levelId: LEVEL, questionId: 'nope', optionId: 'jev' }),
			submitCheck({ levelId: LEVEL, questionId: Q_TOOL, optionId: 'nope' }),
			revealPrediction({ levelId: LEVEL, opponentModelId: 'gpt-nope' })
		])
		for (const result of results) expect(result).toMatchObject({ ok: false, status: 400 })
		expect(fake.db.$transaction).not.toHaveBeenCalled()
	})
})

describe('setLevelStatus', () => {
	it('skips a level with no row', async () => {
		const result = await setLevelStatus({ levelId: LEVEL, status: LEVEL_STATUS.skipped })
		expect(result).toEqual({ ok: true, data: { status: LEVEL_STATUS.skipped } })
		expect(fake.tx.levelProgress.rows).toMatchObject([
			{ userId: USER_ID, levelId: LEVEL, status: LEVEL_STATUS.skipped }
		])
		expect(state.refresh).toHaveBeenCalledTimes(1)
	})

	it('refuses a done level with 409 and does not refresh', async () => {
		fake.tx.levelProgress.rows.push({
			userId: USER_ID,
			levelId: LEVEL,
			status: LEVEL_STATUS.done
		})
		const result = await setLevelStatus({ levelId: LEVEL, status: LEVEL_STATUS.skipped })
		expect(result).toMatchObject({ ok: false, status: 409 })
		expect(fake.tx.levelProgress.rows[0]).toMatchObject({ status: LEVEL_STATUS.done })
		expect(state.refresh).not.toHaveBeenCalled()
	})
})

describe('submitPrediction', () => {
	it('stores the picks and marks the level in progress', async () => {
		const result = await submitPrediction({ levelId: LEVEL, prediction: RIGHT_PICKS })
		expect(result).toEqual({ ok: true, data: { saved: true } })
		expect(fake.tx.levelProgress.rows[0]).toMatchObject({
			userId: USER_ID,
			status: LEVEL_STATUS.inProgress,
			prediction: RIGHT_PICKS
		})
	})

	it('keeps the picks after Reveal and reports saved false', async () => {
		fake.tx.levelProgress.rows.push({
			userId: USER_ID,
			levelId: LEVEL,
			status: LEVEL_STATUS.inProgress,
			prediction: RIGHT_PICKS,
			revealedAt: new Date()
		})
		const result = await submitPrediction({
			levelId: LEVEL,
			prediction: { [PREDICTION_METRICS.fastest]: RACERS.llm }
		})
		expect(result).toEqual({ ok: true, data: { saved: false } })
		expect(fake.tx.levelProgress.rows[0]).toMatchObject({ prediction: RIGHT_PICKS })
	})
})

describe('revealPrediction', () => {
	it('judges the first Reveal, awards 25 XP and then changes nothing', async () => {
		await submitPrediction({ levelId: LEVEL, prediction: RIGHT_PICKS })
		const first = await revealPrediction({ levelId: LEVEL, opponentModelId: OPUS })
		expect(first).toMatchObject({
			ok: true,
			data: { firstReveal: true, predictionCorrect: true, levelDone: false }
		})
		if (!first.ok) return
		expect(first.data.awards.xp).toBe(XP_AMOUNTS[XP_SOURCES.predictionCorrect])
		expect(fake.tx.levelProgress.rows[0]).toMatchObject({
			opponentModelId: OPUS,
			predictionCorrect: true
		})

		const writes = fake.tx.levelProgress.upsert.mock.calls.length
		const second = await revealPrediction({ levelId: LEVEL, opponentModelId: OPUS })
		expect(second).toMatchObject({
			ok: true,
			data: { firstReveal: false, predictionCorrect: true, awards: { xp: 0, badges: [] } }
		})
		expect(fake.tx.levelProgress.upsert.mock.calls.length).toBe(writes)
		expect(fake.tx.xpEvent.rows).toHaveLength(1)
	})

	it('counts a wrong prediction as incorrect with no XP', async () => {
		await submitPrediction({
			levelId: LEVEL,
			prediction: { [PREDICTION_METRICS.fastest]: RACERS.llm }
		})
		const result = await revealPrediction({ levelId: LEVEL, opponentModelId: OPUS })
		expect(result).toMatchObject({
			ok: true,
			data: { predictionCorrect: false, awards: { xp: 0 } }
		})
	})
})

describe('submitCheck', () => {
	it('awards 20 XP for a correct first answer', async () => {
		const result = await submitCheck({ levelId: LEVEL, questionId: Q_TOOL, optionId: 'jev' })
		expect(result).toMatchObject({
			ok: true,
			data: {
				firstAnswer: true,
				correct: true,
				stored: { optionId: 'jev', correct: true },
				awards: { xp: XP_AMOUNTS[XP_SOURCES.checkCorrect] },
				levelDone: false
			}
		})
		expect(fake.tx.levelProgress.rows[0]).toMatchObject({ status: LEVEL_STATUS.inProgress })
	})

	it('keeps the first answer on a repeat and awards nothing', async () => {
		await submitCheck({ levelId: LEVEL, questionId: Q_TOOL, optionId: 'llm' })
		const repeat = await submitCheck({ levelId: LEVEL, questionId: Q_TOOL, optionId: 'jev' })
		expect(repeat).toMatchObject({
			ok: true,
			data: {
				firstAnswer: false,
				correct: true,
				stored: { optionId: 'llm', correct: false },
				awards: { xp: 0 }
			}
		})
		expect(fake.tx.xpEvent.rows).toHaveLength(0)
	})

	it('stores a wrong first answer with no XP', async () => {
		const result = await submitCheck({ levelId: LEVEL, questionId: Q_TOOL, optionId: 'llm' })
		expect(result).toMatchObject({
			ok: true,
			data: { firstAnswer: true, correct: false, stored: { correct: false }, awards: { xp: 0 } }
		})
	})
})

describe('completion', () => {
	it('finishes the level after Reveal and both answers, with the First Race badge', async () => {
		await submitPrediction({ levelId: LEVEL, prediction: RIGHT_PICKS })
		await revealPrediction({ levelId: LEVEL, opponentModelId: OPUS })
		await submitCheck({ levelId: LEVEL, questionId: Q_TOOL, optionId: answerOf(Q_TOOL) })
		const done = await submitCheck({
			levelId: LEVEL,
			questionId: Q_COST,
			optionId: answerOf(Q_COST)
		})

		expect(done).toMatchObject({ ok: true, data: { levelDone: true } })
		if (!done.ok) return
		expect(done.data.awards.xp).toBe(
			XP_AMOUNTS[XP_SOURCES.checkCorrect] + XP_AMOUNTS[XP_SOURCES.levelDone]
		)
		expect(done.data.awards.badges).toEqual([BADGES.firstRace])
		expect(fake.tx.levelProgress.rows[0]).toMatchObject({ status: LEVEL_STATUS.done })
	})

	it('finishes on the Reveal when the answers came first', async () => {
		await submitCheck({ levelId: LEVEL, questionId: Q_TOOL, optionId: answerOf(Q_TOOL) })
		await submitCheck({ levelId: LEVEL, questionId: Q_COST, optionId: answerOf(Q_COST) })
		const result = await revealPrediction({ levelId: LEVEL, opponentModelId: OPUS })
		expect(result).toMatchObject({ ok: true, data: { levelDone: true } })
		if (!result.ok) return
		expect(result.data.awards.xp).toBe(
			XP_AMOUNTS[XP_SOURCES.levelDone] // no picks, so no prediction XP
		)
	})
})

describe('scoping and refresh', () => {
	it('writes only rows owned by the session user', async () => {
		await submitPrediction({ levelId: LEVEL, prediction: RIGHT_PICKS })
		await revealPrediction({ levelId: LEVEL, opponentModelId: OPUS })
		await submitCheck({ levelId: LEVEL, questionId: Q_TOOL, optionId: answerOf(Q_TOOL) })
		await submitCheck({ levelId: LEVEL, questionId: Q_COST, optionId: answerOf(Q_COST) })
		const all = [
			...fake.tx.levelProgress.rows,
			...fake.tx.checkAnswer.rows,
			...fake.tx.xpEvent.rows,
			...fake.tx.userBadge.rows
		]
		expect(all.length).toBeGreaterThan(0)
		for (const row of all) expect(row.userId).toBe(USER_ID)
	})

	it('refreshes once per successful write and not when the transaction fails', async () => {
		await submitPrediction({ levelId: LEVEL, prediction: RIGHT_PICKS })
		expect(state.refresh).toHaveBeenCalledTimes(1)

		fake.db.$transaction.mockRejectedValueOnce(new AppError('boom', { status: 500 }))
		const failed = await submitPrediction({ levelId: LEVEL, prediction: RIGHT_PICKS })
		expect(failed).toMatchObject({ ok: false })
		expect(state.refresh).toHaveBeenCalledTimes(1)
	})
})
