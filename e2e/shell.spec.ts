import { expect, test } from '@playwright/test'
import {
	expectNoHorizontalScroll,
	freshEmail,
	SCREENSHOT_DIR,
	signIn,
	signUp,
	VIEWPORTS
} from './helpers'

// One shared account for the screenshot tests keeps real sign-ups at two per
// run, under Supabase's rate limit; the file runs serially in one worker.
const SHARED_EMAIL = freshEmail()

test.describe.configure({ mode: 'serial' })

test.beforeAll(async ({ browser }) => {
	const page = await browser.newPage()
	await signUp(page, SHARED_EMAIL)
	await page.close()
})

test('a signed-out visitor is sent to sign-in', async ({ page }) => {
	await page.goto('/glossary')
	await expect(page).toHaveURL('/sign-in')
	await expect(page.getByRole('heading', { name: "Jev's Playground" })).toBeVisible()
})

test('sign up, browse, sign out and sign back in', async ({ page }) => {
	const email = freshEmail()
	await signUp(page, email)

	await expect(page.getByRole('heading', { name: "Welcome to Jev's Playground" })).toBeVisible()
	await page.getByRole('link', { name: 'Read the Glossary' }).click()
	await expect(page).toHaveURL('/glossary')
	await expect(page.getByText('Noul', { exact: true })).toBeVisible()

	// Signed in, the sign-in page sends you Home.
	await page.goto('/sign-in')
	await expect(page).toHaveURL('/')

	// Sign out lives in the profile menu, which also shows the email.
	await page.getByRole('button', { name: 'Account menu' }).click()
	await expect(page.getByRole('dialog').getByText(email)).toBeVisible()
	await page.getByRole('button', { name: 'Sign out' }).click()
	await expect(page).toHaveURL('/sign-in')
	await page.goto('/')
	await expect(page).toHaveURL('/sign-in')

	await signIn(page, email)
})

test('the footer links to the Methodology page', async ({ page }) => {
	await signIn(page, SHARED_EMAIL)
	await page.getByRole('contentinfo').getByRole('link', { name: 'Methodology' }).click()
	await expect(page).toHaveURL('/methodology')
	await expect(page.getByRole('heading', { name: 'Methodology', level: 1 })).toBeVisible()
	await expect(page.getByRole('heading', { name: 'Same inputs, same format' })).toBeVisible()
	await expect(page.getByRole('heading', { name: 'Cost' })).toBeVisible()
	// Every provider's prices are grouped under its name, with the page they came from.
	for (const provider of ['TypeSafe (Jev)', 'Anthropic', 'OpenAI', 'Google']) {
		await expect(page.getByRole('columnheader', { name: `${provider} - https://` })).toBeVisible()
	}
	await expect(page.getByRole('rowheader', { name: 'gpt-5.4-mini' })).toBeVisible()
	await expect(
		page.getByRole('rowheader', { name: 'gemini-3.8-flash promotional price until 2026-12-31' })
	).toBeVisible()
})

test('the header stays one row and the sidebar reaches every page', async ({ page }) => {
	await signIn(page, SHARED_EMAIL)
	for (const viewport of Object.values(VIEWPORTS)) {
		await page.setViewportSize(viewport)
		const header = await page.getByRole('banner').boundingBox()
		expect(header!.height).toBeLessThan(80)
	}
	// At the narrowest width that shows the links, they end before the progress bar starts.
	await page.setViewportSize({ width: 1280, height: 800 })
	const banner = page.getByRole('banner')
	const nav = await banner.getByRole('navigation', { name: 'Main' }).boundingBox()
	const progress = await banner.getByRole('progressbar', { name: 'Path progress' }).boundingBox()
	expect(nav!.x + nav!.width).toBeLessThan(progress!.x)
	await page.getByRole('button', { name: 'Open menu' }).click()
	const sidebar = page.getByRole('dialog')
	for (const name of ['Home', 'Path', 'Games', 'Arena', 'Sandbox', 'Quizzes', 'Leaderboard']) {
		await expect(sidebar.getByRole('link', { name, exact: true })).toBeVisible()
	}
	await sidebar.getByRole('link', { name: 'Methodology' }).click()
	await expect(page).toHaveURL('/methodology')
	await expect(page.getByRole('dialog')).toHaveCount(0)

	await page.getByRole('button', { name: 'Account menu' }).click()
	await page.getByRole('link', { name: 'Your profile' }).click()
	await expect(page).toHaveURL('/profile')
})

test('wrong password shows a plain-English error', async ({ page }) => {
	await page.goto('/sign-in')
	await page.getByLabel('Email').fill(freshEmail())
	await page.getByLabel('Password').fill('not-the-password')
	await page.getByRole('button', { name: 'Sign in' }).click()
	// Next's route announcer is an empty role="alert"; skip it.
	await expect(page.getByRole('alert').filter({ hasText: /\S/ })).toHaveText(
		'That email and password do not match an account.'
	)
})

test('too many sign-in attempts for one email are limited, with a toast', async ({ page }) => {
	await page.goto('/sign-in')
	await page.getByLabel('Email').fill(freshEmail())
	await page.getByLabel('Password').fill('not-the-password')
	// The limit is 10 attempts per email in 15 minutes (RATE_LIMITS.signInPerEmail); the 11th is stopped.
	for (let attempt = 0; attempt < 11; attempt += 1) {
		const answered = page.waitForResponse((response) => response.request().method() === 'POST')
		await page.getByRole('button', { name: 'Sign in' }).click()
		await answered
	}
	await expect(page.getByRole('alert').filter({ hasText: /\S/ }).first()).toContainText(
		/Too many attempts\. Wait \d+ seconds/
	)
	await expect(page.getByText('Slow down a little', { exact: true })).toBeVisible()
})

test('the theme switch flips between light and dark', async ({ page }) => {
	await page.emulateMedia({ colorScheme: 'light' })
	await page.goto('/sign-in')
	const html = page.locator('html')
	await expect(html).not.toHaveClass(/dark/)
	await page.getByRole('button', { name: 'Switch theme' }).click()
	await expect(html).toHaveClass(/dark/)
	await page.reload()
	await expect(html).toHaveClass(/dark/)
})

test('the shell works by keyboard alone', async ({ page }) => {
	await page.goto('/sign-in')
	await page.keyboard.press('Tab')
	await expect(page.getByRole('button', { name: 'Switch theme' })).toBeFocused()
	await page.keyboard.press('Tab')
	await expect(page.getByRole('tab', { name: 'Sign in' })).toBeFocused()
	await page.keyboard.press('ArrowRight')
	await expect(page.getByRole('tab', { name: 'Create account' })).toBeFocused()
})

for (const [name, viewport] of Object.entries(VIEWPORTS)) {
	for (const scheme of ['light', 'dark'] as const) {
		test(`screenshots: ${name} ${scheme}`, async ({ page }) => {
			await page.setViewportSize(viewport)
			await page.emulateMedia({ colorScheme: scheme })
			await page.goto('/sign-in')
			await expectNoHorizontalScroll(page)
			await page.screenshot({
				path: `${SCREENSHOT_DIR}/sign-in-${name}-${scheme}.png`,
				fullPage: true
			})
			await signIn(page, SHARED_EMAIL)
			await expectNoHorizontalScroll(page)
			await page.screenshot({
				path: `${SCREENSHOT_DIR}/home-${name}-${scheme}.png`,
				fullPage: true
			})
			await page.goto('/glossary')
			await expectNoHorizontalScroll(page)
			await page.screenshot({
				path: `${SCREENSHOT_DIR}/glossary-${name}-${scheme}.png`,
				fullPage: true
			})
			await page.goto('/methodology')
			await expectNoHorizontalScroll(page)
			await page.screenshot({
				path: `${SCREENSHOT_DIR}/methodology-${name}-${scheme}.png`,
				fullPage: true
			})
		})
	}
}
