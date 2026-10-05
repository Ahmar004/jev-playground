import { expect, type BrowserContext, type Page } from '@playwright/test'

export const PASSWORD = 'e2e-password-123'
export const SCREENSHOT_DIR = 'e2e/screenshots'
export const VIEWPORTS = {
	desktop: { width: 1280, height: 800 },
	phone: { width: 390, height: 844 }
}
export const COLOR_SCHEMES = ['light', 'dark'] as const

// Real Supabase sign-ups (confirmation is off), one fresh address per run.
export function freshEmail(): string {
	return `e2e+${Date.now()}-${Math.floor(Math.random() * 1e6)}@example.com`
}

// Supabase allows about 30 sign-in and sign-up requests per 5 minutes per IP, and a
// full run used to make about 50 of them: one real sign-in per test. The first
// sign-up or sign-in for an email now keeps its session cookies, and later
// signIn calls for it in the same worker put them back instead of signing in
// again (ROADMAP Step-23).
type Cookies = Awaited<ReturnType<BrowserContext['cookies']>>
const sessions = new Map<string, Cookies>()

/** Creates an account and lands Home. A new account opens the welcome tour there; it is skipped unless `keepTour` (a test of the guide itself). */
export async function signUp(page: Page, email: string, options: { keepTour?: boolean } = {}) {
	await page.goto('/sign-in')
	await page.getByRole('tab', { name: 'Create account' }).click()
	const panel = page.getByRole('tabpanel')
	await panel.getByLabel('Email').fill(email)
	await panel.getByLabel('Password').fill(PASSWORD)
	await panel.getByRole('button', { name: 'Create account' }).click()
	await expect(page).toHaveURL('/')
	sessions.set(email, await page.context().cookies())
	if (!options.keepTour) await skipWelcomeTour(page)
}

export const WELCOME_TOUR_TITLE = "Welcome to Jev's Playground"

/**
 * Skips the welcome tour, which turns the level tips off too (ROADMAP Step-35),
 * so no pop-up covers what a test clicks. It waits for the save, because a
 * page.goto right after would cancel it, and closes the confirming toast.
 */
export async function skipWelcomeTour(page: Page) {
	const tour = page.getByRole('dialog', { name: WELCOME_TOUR_TITLE })
	await expect(tour).toBeVisible()
	const saved = page.waitForResponse(
		(response) =>
			response.request().method() === 'POST' &&
			response.request().headers()['next-action'] !== undefined
	)
	await tour.getByRole('button', { name: 'Skip tour' }).click()
	await saved
	await expect(tour).toBeHidden()
	await page
		.locator('li', { hasText: 'Tour skipped' })
		.getByRole('button', { name: 'Dismiss' })
		.click()
}

/** Signs in and lands Home. `fresh` forces a real sign-in, for a test of signing in itself or after a sign-out (which ends the saved session). */
export async function signIn(page: Page, email: string, options: { fresh?: boolean } = {}) {
	const saved = options.fresh ? undefined : sessions.get(email)
	if (saved) {
		await page.context().addCookies(saved)
		await page.goto('/')
		await expect(page).toHaveURL('/')
		return
	}
	await page.goto('/sign-in')
	await page.getByLabel('Email').fill(email)
	await page.getByLabel('Password').fill(PASSWORD)
	await page.getByRole('button', { name: 'Sign in' }).click()
	await expect(page).toHaveURL('/')
	sessions.set(email, await page.context().cookies())
}

type Scheme = (typeof COLOR_SCHEMES)[number]
const THEME_STORAGE_KEY = 'theme'
const RISE_IN_MS = 1500

// next-themes ignores the emulated color scheme, so a "dark" screenshot used to
// render light. It reads its own `theme` local storage key: set it before the
// app loads, and emulate the media query too for anything that asks the browser.
export async function setColorScheme(page: Page, scheme: Scheme) {
	await page.emulateMedia({ colorScheme: scheme })
	await page.addInitScript(([key, value]) => window.localStorage.setItem(key, value), [
		THEME_STORAGE_KEY,
		scheme
	] as const)
}

/** A screenshot that proves the scheme is really applied: it checks the html class, then waits out the page's rise-in animation. */
export async function captureScheme(
	page: Page,
	scheme: Scheme,
	options: Parameters<Page['screenshot']>[0]
) {
	const html = page.locator('html')
	if (scheme === 'dark') await expect(html).toHaveClass(/dark/)
	else await expect(html).not.toHaveClass(/dark/)
	await page.waitForTimeout(RISE_IN_MS)
	await page.screenshot(options)
}

// No horizontal scroll at phone width (R73).
export async function expectNoHorizontalScroll(page: Page) {
	const overflow = await page.evaluate(
		() => document.documentElement.scrollWidth > window.innerWidth
	)
	expect(overflow).toBe(false)
}
