import { describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

const { authRequestConfig, FORWARDED_FOR_HEADER } = await import('./auth-request')

const KEYS = { publishableKey: 'sb_publishable_abc', secretKey: 'sb_secret_xyz' }

describe('authRequestConfig', () => {
	it("sends the visitor's IP with the secret key, so Supabase limits that visitor", () => {
		expect(authRequestConfig('203.0.113.7', KEYS)).toEqual({
			key: KEYS.secretKey,
			headers: { [FORWARDED_FOR_HEADER]: '203.0.113.7' }
		})
	})

	it('uses the header name Supabase reads', () => {
		expect(FORWARDED_FOR_HEADER).toBe('sb-forwarded-for')
	})

	it('keeps the publishable key and sends no header when there is no visitor IP', () => {
		expect(authRequestConfig(null, KEYS)).toEqual({ key: KEYS.publishableKey, headers: {} })
	})

	it('keeps the publishable key when the secret key is not set', () => {
		expect(authRequestConfig('203.0.113.7', { ...KEYS, secretKey: undefined })).toEqual({
			key: KEYS.publishableKey,
			headers: {}
		})
		expect(authRequestConfig('203.0.113.7', { ...KEYS, secretKey: '' })).toEqual({
			key: KEYS.publishableKey,
			headers: {}
		})
	})
})
