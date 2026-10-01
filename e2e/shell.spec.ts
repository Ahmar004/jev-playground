import { expect, test, type Page } from '@playwright/test'

const PASSWORD = 'e2e-password-123'
const SCREENSHOT_DIR = 'e2e/screenshots'
const VIEWPORTS = { desktop: { width: 1280, height: 800 }, phone: { width: 390, height: 844 } }

// Real Supabase sign-ups (confirmation is off), one fresh address per run.
function freshEmail(): string {
	return `e2e+${Date.now()}-${Math.floor(Math.random() * 1e6)}@example.com`
}

// One shared account for the screenshot tests keeps real sign-ups at two per
// run, under Supabase's rate limit; the file runs serially in one worker.
const SHARED_EMAIL = freshEmail()

test.describe.configure({ mode: 'serial' })

test.beforeAll(async ({ browser }) => {
	const page = await browser.newPage()
	await signUp(page, SHARED_EMAIL)
	await page.close()
})

async function signUp(page: Page, email: string) {
	await page.goto('/sign-in')
	await page.getByRole('tab', { name: 'Create account' }).click()
	const panel = page.getByRole('tabpanel')
	await panel.getByLabel('Email').fill(email)
	await panel.getByLabel('Password').fill(PASSWORD)
	await panel.getByRole('button', { name: 'Create account' }).click()
	await expect(page).toHaveURL('/')
}

async function signIn(page: Page, email: string) {
	await page.goto('/sign-in')
	await page.getByLabel('Email').fill(email)
	await page.getByLabel('Password').fill(PASSWORD)
	await page.getByRole('button', { name: 'Sign in' }).click()
	await expect(page).toHaveURL('/')
}

// No horizontal scroll at phone width (R73).
async function expectNoHorizontalScroll(page: Page) {
	const overflow = await page.evaluate(
		() => document.documentElement.scrollWidth > window.innerWidth
	)
	expect(overflow).toBe(false)
}

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
