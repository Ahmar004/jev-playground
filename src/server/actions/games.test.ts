import { beforeEach, describe, expect, it, vi } from 'vitest'
import { CLAUDE_MODELS, MODES, XP_AMOUNTS, XP_SOURCES } from '@/lib/constants'
import { createFakeProgressDb } from '@/server/testing/fake-progress-db'

const USER_ID = '3f2a4c1e-0b7d-4e55-9a10-2c6f1d8e9b42'
const GAME = 'needle-hunt'
const OPUS = CLAUDE_MODELS.opus

type Entry = {
	userId: string
	gameId: string
	modelId: string
	mode: string
	accuracy: number
	wallMs: number
	costUsd: number | null
	runs: number
}
type Key = { userId_gameId_modelId_mode: Pick<Entry, 'userId' | 'gameId' | 'modelId' | 'mode'> }

const state = vi.hoisted(() => ({ fake: undefined as unknown, refresh: vi.fn() }))
vi.mock('@/server/db/client', () => ({
	db: new Proxy({}, { get: (_target, key) => (state.fake as Record<PropertyKey, unknown>)[key] })
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

// The Leaderboard table as a small in-memory delegate (the shared fake has no create).
function leaderboardTable() {
	const rows: Entry[] = []
	const find = ({ userId_gameId_modelId_mode: k }: Key) =>
		rows.find(
			(row) =>
				row.userId === k.userId &&
				row.gameId === k.gameId &&
				row.modelId === k.modelId &&
				row.mode === k.mode
		)
	return {
		rows,
		findUnique: vi.fn(async ({ where }: { where: Key }) => find(where) ?? null),
		findMany: vi.fn(async () => rows.map((row) => ({ gameId: row.gameId }))),
		create: vi.fn(async ({ data }: { data: Omit<Entry, 'runs'> }) => {
			rows.push({ ...data, runs: 1 })
		}),
		update: vi.fn(
			async ({
				where,
				data
			}: {
				where: Key
				data: Partial<Entry> & { runs: { increment: number } }
			}) => {
				const row = find(where)
				if (!row) throw new Error('row not found')
				const { runs, ...rest } = data
				Object.assign(row, rest, { runs: row.runs + runs.increment })
			}
		)
	}
}

async function load() {
	return import('./games')
}

beforeEach(() => {
	const base = createFakeProgressDb()
	const leaderboardEntry = leaderboardTable()
	const tx = { ...base.tx, leaderboardEntry }
	state.fake = {
		...tx,
		$transaction: async (fn: (client: typeof tx) => Promise<unknown>) => fn(tx)
	}
	state.refresh.mockClear()
})

function table(): ReturnType<typeof leaderboardTable> {
	return (state.fake as { leaderboardEntry: ReturnType<typeof leaderboardTable> }).leaderboardEntry
}

describe('recordGameRun', () => {
	it('rejects a game that does not exist', async () => {
		const { recordGameRun } = await load()
		const result = await recordGameRun({
			mode: MODES.beginner,
			gameId: 'nope',
			opponentModelId: OPUS
		})
		expect(result).toMatchObject({ ok: false })
	})

	it('rejects an opponent with no recording', async () => {
		const { recordGameRun } = await load()
		const result = await recordGameRun({
			mode: MODES.beginner,
			gameId: GAME,
			opponentModelId: 'gpt-nothing'
		})
		expect(result).toMatchObject({ ok: false })
		expect(table().rows).toHaveLength(0)
	})

	it('recomputes Beginner numbers from the recordings and awards game XP once', async () => {
		const { recordGameRun } = await load()
		const input = { mode: MODES.beginner, gameId: GAME, opponentModelId: OPUS }
		const first = await recordGameRun(input)
		expect(first).toMatchObject({
			ok: true,
			data: { awards: { xp: XP_AMOUNTS[XP_SOURCES.gameDone] } }
		})
		const modelIds = table()
			.rows.map((row) => row.modelId)
			.sort()
		expect(modelIds).toEqual([OPUS, 'jev-1.13.0'].sort())
		expect(table().rows.every((row) => row.runs === 1 && row.mode === MODES.beginner)).toBe(true)

		const second = await recordGameRun(input)
		expect(second).toMatchObject({ ok: true, data: { awards: { xp: 0 } } })
		expect(table().rows.every((row) => row.runs === 2)).toBe(true)
	})

	it('keeps client numbers for Developer mode, with no XP, and range-checks them', async () => {
		const { recordGameRun } = await load()
		const bad = await recordGameRun({
			mode: MODES.developer,
			gameId: GAME,
			results: [{ modelId: 'm', accuracy: 1.5, wallMs: 10, costUsd: 0 }]
		})
		expect(bad).toMatchObject({ ok: false })
		const good = await recordGameRun({
			mode: MODES.developer,
			gameId: GAME,
			results: [{ modelId: 'm', accuracy: 0.5, wallMs: 10, costUsd: null }]
		})
		expect(good).toMatchObject({ ok: true, data: { awards: { xp: 0 } } })
		expect(table().rows).toEqual([
			{
				userId: USER_ID,
				gameId: GAME,
				modelId: 'm',
				mode: MODES.developer,
				accuracy: 0.5,
				wallMs: 10,
				costUsd: null,
				runs: 1
			}
		])
	})

	it('replaces the stored numbers only for a better run', async () => {
		const { recordGameRun } = await load()
		const run = (accuracy: number, wallMs: number) =>
			recordGameRun({
				mode: MODES.developer,
				gameId: GAME,
				results: [{ modelId: 'm', accuracy, wallMs, costUsd: 0 }]
			})
		await run(0.5, 100)
		await run(0.4, 10)
		expect(table().rows[0]).toMatchObject({ accuracy: 0.5, wallMs: 100, runs: 2 })
		await run(0.5, 50)
		expect(table().rows[0]).toMatchObject({ accuracy: 0.5, wallMs: 50, runs: 3 })
	})
})
