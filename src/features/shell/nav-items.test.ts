import { describe, expect, it } from 'vitest'
import { ROUTES } from '@/lib/links'
import { HEADER_NAV, isActive, SIDEBAR_NAV } from './nav-items'

describe('isActive', () => {
	it('matches a page and the pages under it', () => {
		expect(isActive('/games', ROUTES.games)).toBe(true)
		expect(isActive('/games/twin-finder', ROUTES.games)).toBe(true)
		expect(isActive('/gamesx', ROUTES.games)).toBe(false)
	})

	it('matches Home only on itself', () => {
		expect(isActive('/', ROUTES.home)).toBe(true)
		expect(isActive('/games', ROUTES.home)).toBe(false)
	})
})

describe('nav lists', () => {
	it('the sidebar holds every header link plus Home, Glossary and Methodology', () => {
		const sidebar = SIDEBAR_NAV.map((item) => item.href)
		for (const item of HEADER_NAV) expect(sidebar).toContain(item.href)
		expect(sidebar).toEqual(
			expect.arrayContaining([ROUTES.home, ROUTES.glossary, ROUTES.methodology])
		)
		expect(new Set(sidebar).size).toBe(sidebar.length)
	})
})
