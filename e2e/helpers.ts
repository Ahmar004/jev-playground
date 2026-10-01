import { expect, type Page } from '@playwright/test'

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

export async function signUp(page: Page, email: string) {
	await page.goto('/sign-in')
	await page.getByRole('tab', { name: 'Create account' }).click()
	const panel = page.getByRole('tabpanel')
	await panel.getByLabel('Email').fill(email)
	await panel.getByLabel('Password').fill(PASSWORD)
	await panel.getByRole('button', { name: 'Create account' }).click()
	await expect(page).toHaveURL('/')
}

export async function signIn(page: Page, email: string) {
	await page.goto('/sign-in')
	await page.getByLabel('Email').fill(email)
	await page.getByLabel('Password').fill(PASSWORD)
	await page.getByRole('button', { name: 'Sign in' }).click()
	await expect(page).toHaveURL('/')
}

// No horizontal scroll at phone width (R73).
export async function expectNoHorizontalScroll(page: Page) {
	const overflow = await page.evaluate(
		() => document.documentElement.scrollWidth > window.innerWidth
	)
	expect(overflow).toBe(false)
}
