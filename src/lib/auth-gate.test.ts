import { describe, expect, it } from 'vitest'
import { gateRedirect } from './auth-gate'

describe('gateRedirect', () => {
	it('sends a signed-out visitor on any app page to sign-in', () => {
		expect(gateRedirect('/', false)).toBe('/sign-in')
		expect(gateRedirect('/glossary', false)).toBe('/sign-in')
		expect(gateRedirect('/levels/speed-race', false)).toBe('/sign-in')
	})

	it('lets a signed-out visitor see sign-in and shared results', () => {
		expect(gateRedirect('/sign-in', false)).toBeNull()
		expect(gateRedirect('/s/abc123', false)).toBeNull()
	})

	it('lets a signed-out link-preview bot fetch the Open Graph image', () => {
		expect(gateRedirect('/opengraph-image', false)).toBeNull()
		expect(gateRedirect('/opengraph-image-1a2b3c', false)).toBeNull()
	})

	it('sends a signed-in user away from sign-in to Home', () => {
		expect(gateRedirect('/sign-in', true)).toBe('/')
	})

	it('lets a signed-in user through everywhere else', () => {
		expect(gateRedirect('/', true)).toBeNull()
		expect(gateRedirect('/glossary', true)).toBeNull()
		expect(gateRedirect('/s/abc123', true)).toBeNull()
	})

	it('does not treat a path that only starts with the sign-in text as public', () => {
		expect(gateRedirect('/sign-in-help', false)).toBe('/sign-in')
	})
})
