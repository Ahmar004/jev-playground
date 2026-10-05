import { expect, test, type Page } from '@playwright/test'
import {
	captureScheme,
	COLOR_SCHEMES,
	expectNoHorizontalScroll,
	freshEmail,
	SCREENSHOT_DIR,
	setColorScheme,
	signIn,
	signUp,
	VIEWPORTS,
	WELCOME_TOUR_TITLE
} from './helpers'

// The first-visit guide (ROADMAP Step-35): the welcome tour on Home and the
// one-time tips inside a level. Two accounts: one finishes the tour, one skips it.
const TOUR_STEPS = [
	WELCOME_TOUR_TITLE,
	'Beginner mode needs no keys',
	'The rest can wait',
	'Your path of short levels',
	'Replay this tour any time',
	'Start here'
]
const FINISHER = freshEmail()
const SKIPPER = freshEmail()

test.describe.configure({ mode: 'serial' })

/** Resolves when the next Server Action answers, so a reload can't cancel the save. */
function actionSaved(page: Page) {
	return page.waitForResponse(
		(response) =>
			response.request().method() === 'POST' &&
			response.request().headers()['next-action'] !== undefined
	)
}

async function dismissTip(page: Page, title: string) {
	const tip = page.getByRole('dialog', { name: title })
	await expect(tip).toBeVisible()
	const saved = actionSaved(page)
	await tip.getByRole('button', { name: 'Got it' }).click()
	await saved
	await expect(tip).toBeHidden()
}

test('a new user is walked through Home, then gets one tip per level tab', async ({ page }) => {
	await signUp(page, FINISHER, { keepTour: true })
	for (const [index, title] of TOUR_STEPS.entries()) {
		const step = page.getByRole('dialog', { name: title })
		await expect(step).toBeVisible()
		await expect(step.getByText(`${index + 1} of ${TOUR_STEPS.length}`)).toBeVisible()
		if (index === 0) await step.getByRole('button', { name: 'Show me around' }).click()
		else if (index < TOUR_STEPS.length - 1) await step.getByRole('button', { name: 'Next' }).click()
	}
	const saved = actionSaved(page)
	await page
		.getByRole('dialog', { name: 'Start here' })
		.getByRole('button', { name: 'Play level 1' })
		.click()
	await saved
	await expect(page).toHaveURL('/levels/speed-race')

	await page.getByRole('button', { name: 'Make your prediction' }).click()
	await dismissTip(page, 'Make your guess first')
	// Seen is saved per account: a reload doesn't bring the tip back.
	await page.reload()
	await expect(page.getByRole('heading', { name: 'Predict' })).toBeVisible()
	await page.waitForTimeout(1000)
	await expect(page.getByRole('dialog')).toHaveCount(0)

	for (const group of await page.getByRole('group').all()) {
		await group.getByRole('radio', { name: 'Jev' }).check()
	}
	await page.getByRole('button', { name: 'Lock in my prediction' }).click()
	await page.getByRole('button', { name: 'Start the race' }).click()
	await page.getByRole('button', { name: 'Skip to result' }).click()
	await page.getByRole('button', { name: 'See the result' }).click()
	await dismissTip(page, 'See every item')
	await page.getByText('See every item').click()
	await expect(page.getByText('Correct answer:').first()).toBeVisible()

	await page.getByRole('button', { name: 'Check what you learned' }).click()
	await dismissTip(page, 'Lock in what you learned')

	// Home doesn't open the finished tour again.
	await page.goto('/')
	await expect(page.getByRole('button', { name: 'Take a guide tour' })).toBeVisible()
	await page.waitForTimeout(1000)
	await expect(page.getByRole('dialog')).toHaveCount(0)
})

test('skipping turns the guide off, and the account menu replays it', async ({ page }) => {
	await signUp(page, SKIPPER, { keepTour: true })
	const tour = page.getByRole('dialog', { name: WELCOME_TOUR_TITLE })
	const saved = actionSaved(page)
	await tour.getByRole('button', { name: 'Skip tour' }).click()
	await saved
	await expect(tour).toBeHidden()
	await expect(page.getByText('Tour skipped', { exact: true })).toBeVisible()

	await page.goto('/levels/speed-race?step=predict')
	await expect(page.getByRole('heading', { name: 'Predict' })).toBeVisible()
	await page.waitForTimeout(1000)
	await expect(page.getByRole('dialog')).toHaveCount(0)

	await page.goto('/path')
	await page.getByRole('button', { name: 'Account menu' }).click()
	await page.getByRole('button', { name: 'Take the tour' }).click()
	await expect(page).toHaveURL('/')
	await expect(page.getByRole('dialog', { name: WELCOME_TOUR_TITLE })).toBeVisible()
	await expect(page.getByText('Tour restarted', { exact: true })).toBeVisible()
	// Esc skips; wait for the save so the next test's Home doesn't reopen it.
	const skipped = actionSaved(page)
	await page.keyboard.press('Escape')
	await skipped
	await expect(page.getByRole('dialog', { name: WELCOME_TOUR_TITLE })).toBeHidden()
})

for (const [name, viewport] of Object.entries(VIEWPORTS)) {
	for (const scheme of COLOR_SCHEMES) {
		test(`screenshots: welcome tour ${name} ${scheme}`, async ({ page }) => {
			await page.setViewportSize(viewport)
			await setColorScheme(page, scheme)
			await signIn(page, SKIPPER)
			await page.getByRole('button', { name: 'Take a guide tour' }).click()
			await page.getByRole('button', { name: 'Show me around' }).click()
			await expect(page.getByRole('dialog', { name: TOUR_STEPS[1] })).toBeVisible()
			await expectNoHorizontalScroll(page)
			await captureScheme(page, scheme, {
				path: `${SCREENSHOT_DIR}/guide-mode-${name}-${scheme}.png`
			})
			// The sections step spotlights the header links, or the menu button on a phone.
			await page.getByRole('button', { name: 'Next' }).click()
			await expect(page.getByRole('dialog', { name: TOUR_STEPS[2] })).toBeVisible()
			await captureScheme(page, scheme, {
				path: `${SCREENSHOT_DIR}/guide-sections-${name}-${scheme}.png`
			})
		})
	}
}
