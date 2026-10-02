import { describe, expect, it } from 'vitest'
import { connectSrc } from './csp'

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
