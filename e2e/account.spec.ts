import { expect, test } from '@playwright/test'
import {
	captureScheme,
	COLOR_SCHEMES,
	expectNoHorizontalScroll,
	freshEmail,
	PASSWORD,
	SCREENSHOT_DIR,
	setColorScheme,
	signUp,
	VIEWPORTS
} from './helpers'

// Flow (ROADMAP Step-21): read the Privacy page, then delete the account from Profile.
test('the Privacy page says what is stored, and the footer links to it', async ({ page }) => {
	await signUp(page, freshEmail())
	await page
		.getByRole('navigation', { name: 'Footer' })
		.getByRole('link', { name: 'Privacy' })
		.click()
	await expect(page).toHaveURL('/privacy')
	await expect(page.getByRole('heading', { name: 'What we store', exact: true })).toBeVisible()
	await expect(page.getByRole('heading', { name: 'What we never store' })).toBeVisible()
	await expect(page.getByText(/Your API keys\. They live in this tab only/)).toBeVisible()
	for (const scheme of COLOR_SCHEMES) {
		for (const [name, viewport] of Object.entries(VIEWPORTS)) {
			await page.setViewportSize(viewport)
			await setColorScheme(page, scheme)
			await page.goto('/privacy')
			await expect(page.getByRole('heading', { name: 'Privacy', exact: true })).toBeVisible()
			await expectNoHorizontalScroll(page)
			await captureScheme(page, scheme, {
				path: `${SCREENSHOT_DIR}/privacy-${scheme}-${name}.png`,
				fullPage: true
			})
		}
	}
})

test('deleting the account asks first, signs out, and the credentials stop working', async ({
	page
}) => {
	const email = freshEmail()
	await signUp(page, email)
	await page.goto('/profile')
	await expect(page.getByRole('heading', { name: 'Delete your account' })).toBeVisible()

	// Cancel keeps the account.
	await page.getByRole('button', { name: 'Delete my account' }).click()
	await expect(page.getByRole('dialog', { name: 'Delete your account?' })).toBeVisible()
	await page.keyboard.press('Escape')
	await expect(page.getByRole('dialog')).toHaveCount(0)
	await page.goto('/')
	await expect(page).toHaveURL('/')

	// Confirm deletes it and lands on sign-in.
	await page.goto('/profile')
	await page.getByRole('button', { name: 'Delete my account' }).click()
	await page.getByRole('button', { name: 'Yes, delete everything' }).click()
	await expect(page).toHaveURL('/sign-in')

	// The deleted sign-in no longer works, and the app is closed again.
	await page.getByLabel('Email').fill(email)
	await page.getByLabel('Password').fill(PASSWORD)
	await page.getByRole('button', { name: 'Sign in' }).click()
	await expect(page.getByText('That email and password do not match an account.')).toBeVisible()
	await page.goto('/profile')
	await expect(page).toHaveURL('/sign-in')
})
