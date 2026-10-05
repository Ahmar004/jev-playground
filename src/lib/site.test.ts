import { describe, expect, it } from 'vitest'
import { absoluteUrl, buildRobots, buildSitemap, normalizeBaseUrl } from './site'

const BASE = 'https://letsplaywithjev.vercel.app'

describe('normalizeBaseUrl', () => {
	it('drops trailing slashes so joined paths never double up', () => {
		expect(normalizeBaseUrl('https://letsplaywithjev.vercel.app/')).toBe(BASE)
		expect(normalizeBaseUrl('https://letsplaywithjev.vercel.app///')).toBe(BASE)
	})

	it('keeps a clean URL and a port as they are', () => {
		expect(normalizeBaseUrl(BASE)).toBe(BASE)
		expect(normalizeBaseUrl('http://localhost:3000')).toBe('http://localhost:3000')
	})
})

describe('absoluteUrl', () => {
	it('joins a path onto the base', () => {
		expect(absoluteUrl(BASE, '/sign-in')).toBe(`${BASE}/sign-in`)
	})

	it('gives the bare origin for the root path', () => {
		expect(absoluteUrl(BASE, '/')).toBe(BASE)
	})
})

describe('buildSitemap', () => {
	it('lists only the pages a signed-out visitor can reach and index', () => {
		const urls = buildSitemap(BASE).map((entry) => entry.url)
		expect(urls).toEqual([`${BASE}/sign-in`])
	})

	it('never lists a shared result (R87)', () => {
		expect(buildSitemap(BASE).some((entry) => entry.url.includes('/s/'))).toBe(false)
	})
})

describe('buildRobots', () => {
	it('allows crawling, so a crawler can read the noindex on shared results', () => {
		const robots = buildRobots(BASE)
		expect(robots.rules).toEqual({ userAgent: '*', allow: '/' })
	})

	it('points at the sitemap on the configured URL', () => {
		expect(buildRobots(BASE).sitemap).toBe(`${BASE}/sitemap.xml`)
	})
})
