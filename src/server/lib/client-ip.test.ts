import { describe, expect, it } from 'vitest'
import { clientIp } from './client-ip'

describe('clientIp', () => {
	it('takes the first address of x-forwarded-for', () => {
		const headers = new Headers({ 'x-forwarded-for': ' 203.0.113.7 , 10.0.0.1' })
		expect(clientIp(headers)).toBe('203.0.113.7')
	})

	it('falls back to x-real-ip', () => {
		expect(clientIp(new Headers({ 'x-real-ip': '198.51.100.4' }))).toBe('198.51.100.4')
	})

	it('is null when the server cannot see an address, as on localhost', () => {
		expect(clientIp(new Headers())).toBeNull()
		expect(clientIp(new Headers({ 'x-forwarded-for': ' ' }))).toBeNull()
	})

	it.each(['127.0.0.1', '::1', '::ffff:127.0.0.1'])(
		'treats the loopback address %s as no address, so local development and tests are not limited',
		(address) => {
			expect(clientIp(new Headers({ 'x-forwarded-for': address }))).toBeNull()
		}
	)
})
