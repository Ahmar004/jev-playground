import { beforeEach, describe, expect, it, vi } from 'vitest'
import { XP_AMOUNTS, XP_SOURCES } from '@/lib/constants'
import { createFakeProgressDb } from '@/server/testing/fake-progress-db'
import { recordArenaRun } from './arena'

const USER_ID = '3f2a4c1e-0b7d-4e55-9a10-2c6f1d8e9b42'

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

beforeEach(() => {
	state.fake = createFakeProgressDb().db
	vi.clearAllMocks()
})

describe('recordArenaRun', () => {
	it('awards XP once per preset, never again on a replay', async () => {
		const first = await recordArenaRun({ presetId: 'ticket-triage' })
		expect(first).toEqual({
			ok: true,
			data: { awards: { xp: XP_AMOUNTS[XP_SOURCES.arenaPreset], badges: [] } }
		})
		const again = await recordArenaRun({ presetId: 'ticket-triage' })
		expect(again.ok && again.data.awards.xp).toBe(0)
		const other = await recordArenaRun({ presetId: 'product-match' })
		expect(other.ok && other.data.awards.xp).toBe(XP_AMOUNTS[XP_SOURCES.arenaPreset])
	})

	it('refuses an unknown preset', async () => {
		const result = await recordArenaRun({ presetId: 'nope' })
		expect(result).toMatchObject({ ok: false, error: 'That preset does not exist.' })
	})
})
