import { describe, expect, it } from 'vitest'
import { connectSrc, contentSecurityPolicy, SECURITY_HEADERS } from './csp'

const base = { supabaseUrl: 'https://abc.supabase.co/', posthogHost: 'https://us.i.posthog.com' }

describe('connectSrc', () => {
	it('allows our server, the four key-taking providers, Supabase, PostHog and Sentry', () => {
		const policy = connectSrc({ ...base, development: false })
		for (const host of [
			"'self'",
			'https://openrouter.ai',
			'https://api.anthropic.com',
			'https://api.openai.com',
			'https://generativelanguage.googleapis.com',
			'https://abc.supabase.co',
			'https://us.i.posthog.com',
			'https://*.ingest.us.sentry.io'
		]) {
			expect(policy).toContain(host)
		}
	})

	it('never allows TypeSafe from the browser (its calls go through /api/jev) or a wildcard', () => {
		const policy = connectSrc({ ...base, development: false })
		expect(policy).not.toContain('typesafe')
		expect(policy).not.toMatch(/\s\*(\s|$)/)
	})

	it('adds the hot-reload WebSocket in development only', () => {
		expect(connectSrc({ ...base, development: true })).toContain('ws:')
		expect(connectSrc({ ...base, development: false })).not.toContain('ws:')
	})

	it('lists each host once', () => {
		const policy = connectSrc({ ...base, development: false })
		expect(policy.match(/us\.i\.posthog\.com/g)).toHaveLength(1)
	})
})

describe('contentSecurityPolicy', () => {
	it('keeps the connect-src allowlist and adds the directives that need no nonce', () => {
		const policy = contentSecurityPolicy({ ...base, development: false })
		expect(policy.startsWith(connectSrc({ ...base, development: false }))).toBe(true)
		for (const directive of [
			"frame-ancestors 'none'",
			"base-uri 'self'",
			"form-action 'self'",
			"object-src 'none'"
		]) {
			expect(policy).toContain(directive)
		}
	})

	it('does not restrict scripts or styles, which Next.js inlines without a nonce', () => {
		const policy = contentSecurityPolicy({ ...base, development: false })
		expect(policy).not.toMatch(/script-src|style-src|default-src/)
	})
})

describe('SECURITY_HEADERS', () => {
	const byKey = Object.fromEntries(SECURITY_HEADERS.map(({ key, value }) => [key, value]))

	it('sets HSTS for two years, clickjacking, sniffing and referrer protection', () => {
		expect(byKey['Strict-Transport-Security']).toContain('max-age=63072000')
		expect(byKey['X-Frame-Options']).toBe('DENY')
		expect(byKey['X-Content-Type-Options']).toBe('nosniff')
		expect(byKey['Referrer-Policy']).toBe('strict-origin-when-cross-origin')
	})

	it('turns off the browser features the app never uses', () => {
		expect(byKey['Permissions-Policy']).toBe('camera=(), microphone=(), geolocation=()')
	})
})
