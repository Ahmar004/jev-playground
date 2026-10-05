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
	VIEWPORTS
} from './helpers'

// One account for the whole file keeps real sign-ups at one per run.
const EMAIL = freshEmail()

test.describe.configure({ mode: 'serial' })

test.beforeAll(async ({ browser }) => {
	const page = await browser.newPage()
	await signUp(page, EMAIL)
	await page.close()
})

async function openStep(page: Page, levelId: string, step: string) {
	await page.goto(`/levels/${levelId}?step=${step}`)
	await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
}

// Picks `racer` in every prediction group that is still open.
async function predict(page: Page, racer: 'Jev' | 'Claude Opus 5.5' | 'LLM') {
	await expect(page.getByRole('heading', { name: 'Predict' })).toBeVisible()
	for (const group of await page.getByRole('group').all()) {
		const radio = group.getByRole('radio', { name: racer })
		if (await radio.isEnabled()) await radio.check()
	}
	await page.getByRole('button', { name: /^(Lock in my prediction|Back to the race)$/ }).click()
}

test('level 2: Jev has no way to write a poem, the LLM does', async ({ page }) => {
	await signIn(page, EMAIL)
	await page.goto('/path')
	// Path lists every built level; level 2's card holds its Play link.
	const card = page.getByRole('listitem').filter({ hasText: 'Write Me a Poem' })
	await card.getByRole('link', { name: 'Play' }).click()
	await expect(page).toHaveURL('/levels/write-me-a-poem')
	await page.getByRole('button', { name: 'Make your prediction' }).click()
	await predict(page, 'LLM')
	await expect(page).toHaveURL(/step=play/)
	await page.getByRole('button', { name: 'Start the race' }).click()
	await page.getByRole('button', { name: 'Skip to result' }).click()
	await expect(page.getByText('Finished. These are the recorded numbers.')).toBeVisible()
	await page.getByRole('button', { name: 'See the result' }).click()
	await expect(page.getByRole('heading', { name: 'What happened' })).toBeVisible()
	// The LLM delivered a poem for every topic and Jev delivered none.
	await expect(
		page.getByRole('list', { name: 'Your prediction' }).getByText('You got it')
	).toBeVisible()
	await page.getByText('See every item').click()
	// Jev's real rejection is shown as a failed call, with its raw response (R44).
	await expect(page.getByText('Call failed').first()).toBeVisible()
	await expect(page.getByText(/Invalid request/).first()).toBeVisible()
})

test('level 3: four races, with Jev + Code after the fix', async ({ page }) => {
	await signIn(page, EMAIL)
	await openStep(page, 'count-and-dates', 'predict')
	await predict(page, 'Jev')
	await expect(page).toHaveURL(/step=play/)
	await expect(page.getByRole('heading', { name: 'Count the fruits: after the fix' })).toBeVisible()
	await expect(
		page.getByRole('heading', { name: 'Which date is first: asked directly' })
	).toBeVisible()
	await expect(page.getByRole('button', { name: 'Start the race' })).toHaveCount(4)
	await page.getByRole('button', { name: 'Start the race' }).first().click()
	await page.getByRole('button', { name: 'Skip to result' }).click()
	await page.getByRole('button', { name: 'See the result' }).click()
	await expect(page.getByRole('heading', { name: 'What happened' })).toBeVisible()
	// Recorded: Jev counts 2 of 4 fruit lists right asked directly, and Jev + Code 4 of 4.
	const fixed = page.getByRole('table', { name: /Every recorded model on the same 4 items/ })
	await expect(fixed).toHaveCount(4)
	await expect(page.getByRole('row', { name: /Jev \+ Code/ })).toHaveCount(2)
})

test('level 4: rate the statements, then see the calibration chart', async ({ page }) => {
	await signIn(page, EMAIL)
	await openStep(page, 'how-sure', 'play')
	await expect(page.getByRole('heading', { name: 'Rate each statement' })).toBeVisible()
	// The slider waits for a true or false call.
	await expect(page.getByRole('slider').first()).toBeDisabled()
	await page.getByRole('radio', { name: 'True' }).first().check()
	await expect(page.getByRole('slider').first()).toBeEnabled()
	await page.getByRole('slider').first().fill('0.9')
	await expect(page.getByText('1 of 10 rated')).toBeVisible()
	await page.getByRole('button', { name: 'See the result' }).click()
	await expect(page.getByRole('heading', { name: 'How sure, and how often right' })).toBeVisible()
	await expect(page.getByRole('img', { name: /Calibration chart/ })).toBeVisible()
	await expect(
		page.getByRole('table', { name: 'Right answers at each confidence level' })
	).toBeVisible()
	await expect(page.getByText('You: open squares, dashed line')).toBeVisible()
})

for (const [name, viewport] of Object.entries(VIEWPORTS)) {
	for (const scheme of COLOR_SCHEMES) {
		test(`screenshots: levels 2-4 ${name} ${scheme}`, async ({ page }) => {
			await page.setViewportSize(viewport)
			await setColorScheme(page, scheme)
			await signIn(page, EMAIL)
			for (const [levelId, step] of [
				['write-me-a-poem', 'reveal'],
				['count-and-dates', 'play'],
				['count-and-dates', 'reveal'],
				['how-sure', 'play'],
				['how-sure', 'reveal']
			] as const) {
				await openStep(page, levelId, step)
				await page.waitForTimeout(800)
				await expectNoHorizontalScroll(page)
				await captureScheme(page, scheme, {
					path: `${SCREENSHOT_DIR}/${levelId}-${step}-${name}-${scheme}.png`,
					fullPage: true
				})
			}
		})
	}
}
