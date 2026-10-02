import { beforeEach, describe, expect, it, vi } from 'vitest'
import { presetView } from '@/content/arena'
import { BADGES, CLAUDE_MODELS, MODES, SHARE_LIMITS } from '@/lib/constants'
import { createShare, deleteShare } from './share'

const USER_ID = '3f2a4c1e-0b7d-4e55-9a10-2c6f1d8e9b42'

const state = vi.hoisted(() => ({
	count: vi.fn(),
	create: vi.fn(),
	deleteMany: vi.fn(),
	badgeCreateMany: vi.fn(),
	refresh: vi.fn()
}))

vi.mock('@/server/db/client', () => ({
	db: {
		share: { count: state.count, deleteMany: state.deleteMany },
		$transaction: async (run: (tx: unknown) => Promise<unknown>) =>
			run({ share: { create: state.create }, userBadge: { createMany: state.badgeCreateMany } })
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

beforeEach(() => {
	vi.clearAllMocks()
	state.count.mockResolvedValue(0)
	state.create.mockResolvedValue(undefined)
	state.badgeCreateMany.mockResolvedValue({ count: 1 })
})

function developerSnapshot(overrides: Record<string, unknown> = {}) {
	const view = presetView('product-match')
	if (!view?.jev || !view.opponents[0]) throw new Error('fixture preset is not recorded')
	return {
		mode: MODES.developer,
		title: view.preset.title,
		presetId: view.preset.id,
		question: view.question,
		state: view.state,
		sides: [view.jev, view.opponents[0]],
		...overrides
	}
}

describe('createShare, Beginner mode', () => {
	it('builds the snapshot on the server from the recordings and returns a random id', async () => {
		const result = await createShare({
			mode: MODES.beginner,
			presetId: 'ticket-triage',
			opponentModelId: CLAUDE_MODELS.opus
		})
		expect(result.ok).toBe(true)
		if (!result.ok) return
		// 16 random bytes in base64url.
		expect(result.data.id).toMatch(/^[A-Za-z0-9_-]{22}$/)
		expect(result.data.badges).toEqual([BADGES.sharer])
		const row = state.create.mock.calls[0]?.[0].data
		expect(row).toMatchObject({ userId: USER_ID, mode: MODES.beginner })
		expect(row.payload.mode).toBe(MODES.beginner)
		expect(row.payload.sides.map((side: { modelId: string }) => side.modelId)).toEqual([
			expect.stringMatching(/^jev-/),
			CLAUDE_MODELS.opus
		])
		expect(state.refresh).toHaveBeenCalled()
	})

	it('does not announce the badge on a later share', async () => {
		state.badgeCreateMany.mockResolvedValue({ count: 0 })
		const result = await createShare({
			mode: MODES.beginner,
			presetId: 'ticket-triage',
			opponentModelId: CLAUDE_MODELS.haiku
		})
		expect(result.ok && result.data.badges).toEqual([])
	})

	it('refuses an unknown preset or an opponent with no recording', async () => {
		const unknownPreset = await createShare({
			mode: MODES.beginner,
			presetId: 'nope',
			opponentModelId: CLAUDE_MODELS.opus
		})
		expect(unknownPreset).toMatchObject({ ok: false, error: 'That preset does not exist.' })
		const unknownModel = await createShare({
			mode: MODES.beginner,
			presetId: 'ticket-triage',
			opponentModelId: 'gpt-x'
		})
		expect(unknownModel.ok).toBe(false)
		expect(state.create).not.toHaveBeenCalled()
	})
})

describe('createShare, Developer mode', () => {
	it('shares an unedited preset without consent', async () => {
		const result = await createShare({
			mode: MODES.developer,
			consent: false,
			snapshot: developerSnapshot()
		})
		expect(result.ok).toBe(true)
	})

	it('needs consent for a custom task and for an edited preset input', async () => {
		const custom = developerSnapshot({ presetId: undefined, title: 'Custom task', state: 'mine' })
		const edited = developerSnapshot({ state: 'my own listing text' })
		for (const snapshot of [custom, edited]) {
			const refused = await createShare({ mode: MODES.developer, consent: false, snapshot })
			expect(refused).toMatchObject({ ok: false })
			expect(refused.ok === false && refused.error).toMatch(/public/)
			const accepted = await createShare({ mode: MODES.developer, consent: true, snapshot })
			expect(accepted.ok).toBe(true)
		}
	})

	it('refuses a snapshot labelled Beginner mode, an unknown preset, and an oversized one', async () => {
		const labelled = await createShare({
			mode: MODES.developer,
			consent: true,
			snapshot: developerSnapshot({ mode: MODES.beginner })
		})
		expect(labelled.ok).toBe(false)
		const unknown = await createShare({
			mode: MODES.developer,
			consent: true,
			snapshot: developerSnapshot({ presetId: 'nope' })
		})
		expect(unknown.ok).toBe(false)
		const snapshot = developerSnapshot()
		const big = {
			...snapshot,
			sides: [
				{
					...snapshot.sides[0],
					result: { ...snapshot.sides[0]?.result, parsed: 'p'.repeat(40_000) }
				}
			]
		}
		const oversized = await createShare({ mode: MODES.developer, consent: true, snapshot: big })
		expect(oversized).toMatchObject({ ok: false, status: 400 })
		expect(state.create).not.toHaveBeenCalled()
	})
})

describe('createShare, limits', () => {
	it('allows a limited number of shares a day, counted from Share rows', async () => {
		state.count.mockResolvedValue(SHARE_LIMITS.perUserPerDay)
		const result = await createShare({
			mode: MODES.beginner,
			presetId: 'ticket-triage',
			opponentModelId: CLAUDE_MODELS.opus
		})
		expect(result).toMatchObject({ ok: false, status: 429 })
		expect(state.create).not.toHaveBeenCalled()
		const where = state.count.mock.calls[0]?.[0].where
		expect(where.userId).toBe(USER_ID)
		expect(where.createdAt.gte).toBeInstanceOf(Date)
	})
})

describe('deleteShare', () => {
	it('deletes only the signed-in user own share', async () => {
		state.deleteMany.mockResolvedValue({ count: 1 })
		const result = await deleteShare({ shareId: 'abc' })
		expect(result).toEqual({ ok: true, data: { deleted: true } })
		expect(state.deleteMany).toHaveBeenCalledWith({ where: { id: 'abc', userId: USER_ID } })
		expect(state.refresh).toHaveBeenCalled()
	})

	it('says so when there is nothing to delete, for example another user share', async () => {
		state.deleteMany.mockResolvedValue({ count: 0 })
		const result = await deleteShare({ shareId: 'abc' })
		expect(result).toMatchObject({ ok: false, status: 404 })
	})
})
