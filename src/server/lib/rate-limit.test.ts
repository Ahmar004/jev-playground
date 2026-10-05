import { beforeEach, describe, expect, it, vi } from 'vitest'
import { RATE_LIMIT_PURGE_MS } from '@/lib/constants'

const state = vi.hoisted(() => ({ upsert: vi.fn(), deleteMany: vi.fn(), warn: vi.fn() }))
vi.mock('@/server/db/client', () => ({
	db: { rateLimitCounter: { upsert: state.upsert, deleteMany: state.deleteMany } }
}))
vi.mock('@/server/lib/logger', () => ({ log: { warn: state.warn } }))

const { assertWithinLimit, checkRateLimit } = await import('./rate-limit')

const RULE = { bucket: 'test_bucket', limit: 3, windowMs: 60_000 }
// 12 seconds into a window that started at 600_000.
const NOW = 600_000 + 12_000

beforeEach(() => {
	vi.clearAllMocks()
	state.upsert.mockResolvedValue({ count: 1 })
	state.deleteMany.mockResolvedValue({ count: 0 })
})

describe('checkRateLimit', () => {
	it('counts one hit in the current fixed window, under a hash of the key', async () => {
		const result = await checkRateLimit(RULE, 'ada@example.com', NOW)
		expect(result).toEqual({ allowed: true, retryAfterSec: 0 })
		const call = state.upsert.mock.calls[0]?.[0]
		expect(call.where.bucket_keyHash_windowStart).toMatchObject({
			bucket: 'test_bucket',
			windowStart: new Date(600_000)
		})
		expect(call.update).toEqual({ count: { increment: 1 } })
		const stored = JSON.stringify(call)
		expect(stored).not.toContain('ada@example.com')
		expect(call.where.bucket_keyHash_windowStart.keyHash).toMatch(/^[0-9a-f]{64}$/)
	})

	it('allows up to the limit and blocks the next hit with the seconds left in the window', async () => {
		state.upsert.mockResolvedValueOnce({ count: 3 })
		expect((await checkRateLimit(RULE, 'k', NOW)).allowed).toBe(true)
		state.upsert.mockResolvedValueOnce({ count: 4 })
		expect(await checkRateLimit(RULE, 'k', NOW)).toEqual({ allowed: false, retryAfterSec: 48 })
	})

	it('uses a different row for another key, bucket or window', async () => {
		await checkRateLimit(RULE, 'a', NOW)
		await checkRateLimit(RULE, 'b', NOW)
		await checkRateLimit({ ...RULE, bucket: 'other' }, 'a', NOW)
		await checkRateLimit(RULE, 'a', NOW + RULE.windowMs)
		const ids = state.upsert.mock.calls.map((call) =>
			JSON.stringify(call[0].where.bucket_keyHash_windowStart)
		)
		expect(new Set(ids).size).toBe(4)
	})

	it('purges old counters when a window starts for a key, and not on later hits', async () => {
		await checkRateLimit(RULE, 'k', NOW)
		expect(state.deleteMany).toHaveBeenCalledWith({
			where: { windowStart: { lt: new Date(NOW - RATE_LIMIT_PURGE_MS) } }
		})
		state.deleteMany.mockClear()
		state.upsert.mockResolvedValueOnce({ count: 2 })
		await checkRateLimit(RULE, 'k', NOW)
		expect(state.deleteMany).not.toHaveBeenCalled()
	})

	it('lets the request through and logs when the database fails, so a broken limiter never locks users out', async () => {
		state.upsert.mockRejectedValueOnce(new Error('connection refused'))
		expect(await checkRateLimit(RULE, 'k', NOW)).toEqual({ allowed: true, retryAfterSec: 0 })
		expect(state.warn).toHaveBeenCalledTimes(1)
		expect(JSON.stringify(state.warn.mock.calls)).not.toContain('"k"')
	})
})

describe('assertWithinLimit', () => {
	it('throws a 429 AppError that says how long to wait', async () => {
		state.upsert.mockResolvedValueOnce({ count: 4 })
		await expect(assertWithinLimit(RULE, 'k', NOW)).rejects.toMatchObject({
			status: 429,
			message: expect.stringContaining('48 seconds')
		})
	})

	it('does nothing under the limit', async () => {
		await expect(assertWithinLimit(RULE, 'k', NOW)).resolves.toBeUndefined()
	})
})
