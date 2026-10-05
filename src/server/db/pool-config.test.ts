import { describe, expect, it } from 'vitest'
import {
	LOCAL_POOL_MAX,
	VERCEL_IDLE_TIMEOUT_MS,
	VERCEL_POOL_MAX,
	poolConnectionLimit,
	poolIdleTimeout
} from './pool-config'

describe('poolConnectionLimit', () => {
	it('is 40 on this machine, where one process serves every user', () => {
		expect(poolConnectionLimit({})).toBe(LOCAL_POOL_MAX)
		expect(LOCAL_POOL_MAX).toBe(40)
	})

	it('is about 5 on Vercel, where every function instance opens its own pool', () => {
		expect(poolConnectionLimit({ VERCEL: '1' })).toBe(VERCEL_POOL_MAX)
		expect(VERCEL_POOL_MAX).toBeLessThanOrEqual(5)
	})

	it('lets DATABASE_POOL_MAX override either default', () => {
		expect(poolConnectionLimit({ DATABASE_POOL_MAX: '12' })).toBe(12)
		expect(poolConnectionLimit({ VERCEL: '1', DATABASE_POOL_MAX: '3' })).toBe(3)
	})

	it('ignores a value that is not a positive whole number', () => {
		for (const bad of ['', '0', '-4', '2.5', 'many', ' ']) {
			expect(poolConnectionLimit({ DATABASE_POOL_MAX: bad })).toBe(LOCAL_POOL_MAX)
			expect(poolConnectionLimit({ VERCEL: '1', DATABASE_POOL_MAX: bad })).toBe(VERCEL_POOL_MAX)
		}
	})

	it('closes idle connections within seconds on Vercel', () => {
		expect(poolIdleTimeout({ VERCEL: '1' })).toBe(VERCEL_IDLE_TIMEOUT_MS)
		expect(VERCEL_IDLE_TIMEOUT_MS).toBeLessThanOrEqual(10_000)
	})

	it('leaves node-pg default idle timeout alone elsewhere, where a new connection to a remote database costs about half a second', () => {
		expect(poolIdleTimeout({})).toBeUndefined()
	})
})
