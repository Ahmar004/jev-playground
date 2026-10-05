import { beforeEach, describe, expect, it, vi } from 'vitest'

const USER_ID = '3f2a4c1e-0b7d-4e55-9a10-2c6f1d8e9b42'

const state = vi.hoisted(() => ({
	findUnique: vi.fn(),
	update: vi.fn(),
	refresh: vi.fn(),
	signedIn: true
}))

vi.mock('@/server/db/client', () => {
	const user = { findUnique: state.findUnique, update: state.update }
	return {
		db: {
			user,
			$transaction: async (run: (tx: { user: typeof user }) => Promise<unknown>) => run({ user })
		}
	}
})
vi.mock('next/cache', () => ({ refresh: state.refresh }))
vi.mock('@/server/auth/session', () => ({
	requireUser: async () => {
		if (!state.signedIn) throw Object.assign(new Error('no session'), { status: 401 })
		return { userId: USER_ID, email: 'ada@example.com' }
	}
}))
vi.mock('@/lib/observability/capture-error', () => ({
	captureError: (error: { status?: number }) => ({
		userMessage: 'Something went wrong. Please try again.',
		status: error.status ?? 500
	})
}))

const { markGuideSeen, resetGuide } = await import('./guide')

beforeEach(() => {
	vi.clearAllMocks()
	state.signedIn = true
	state.findUnique.mockResolvedValue({ guideSeen: ['check'] })
	state.update.mockResolvedValue({})
})

describe('markGuideSeen', () => {
	it("adds the parts to the signed-in user's own row, without repeats", async () => {
		const result = await markGuideSeen({ parts: ['welcome', 'check'] })
		expect(state.findUnique).toHaveBeenCalledWith({
			where: { id: USER_ID },
			select: { guideSeen: true }
		})
		expect(state.update).toHaveBeenCalledWith({
			where: { id: USER_ID },
			data: { guideSeen: ['welcome', 'check'] }
		})
		expect(result).toEqual({ ok: true, data: { seen: ['welcome', 'check'] } })
		expect(state.refresh).toHaveBeenCalled()
	})

	it('writes nothing when every part is already seen', async () => {
		const result = await markGuideSeen({ parts: ['check'] })
		expect(state.update).not.toHaveBeenCalled()
		expect(result).toEqual({ ok: true, data: { seen: ['check'] } })
	})

	it('rejects an unknown part or an empty list', async () => {
		expect(await markGuideSeen({ parts: ['nope'] })).toMatchObject({ ok: false, status: 400 })
		expect(await markGuideSeen({ parts: [] })).toMatchObject({ ok: false, status: 400 })
		expect(state.update).not.toHaveBeenCalled()
	})

	it('refuses a signed-out caller', async () => {
		state.signedIn = false
		expect(await markGuideSeen({ parts: ['welcome'] })).toMatchObject({ ok: false, status: 401 })
		expect(state.findUnique).not.toHaveBeenCalled()
	})
})

describe('resetGuide', () => {
	it("empties only the signed-in user's list, so the tour and tips show again", async () => {
		const result = await resetGuide(undefined)
		expect(state.update).toHaveBeenCalledWith({
			where: { id: USER_ID },
			data: { guideSeen: [] }
		})
		expect(result).toEqual({ ok: true, data: { seen: [] } })
		expect(state.refresh).toHaveBeenCalled()
	})

	it('refuses a signed-out caller', async () => {
		state.signedIn = false
		expect(await resetGuide(undefined)).toMatchObject({ ok: false, status: 401 })
		expect(state.update).not.toHaveBeenCalled()
	})
})
