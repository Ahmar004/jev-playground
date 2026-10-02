import { expect, test, type Page } from '@playwright/test'
import {
	COLOR_SCHEMES,
	expectNoHorizontalScroll,
	freshEmail,
	SCREENSHOT_DIR,
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

const opponentButton = (page: Page) => page.getByRole('button', { name: /^Opponent:/ })

async function predictJevEverywhere(page: Page) {
	// all() doesn't wait, so wait for the step first.
	await expect(page.getByRole('heading', { name: 'Predict' })).toBeVisible()
	for (const group of await page.getByRole('group').all()) {
		const radio = group.getByRole('radio', { name: 'Jev' })
		// Once an earlier test revealed, the account's picks are final and disabled.
		if (await radio.isEnabled()) await radio.check()
	}
}

test('level 1: learn, predict, race the recording and reveal', async ({ page }) => {
	await signIn(page, EMAIL)
	await page.getByRole('link', { name: 'Play level 1: Speed Race' }).click()
	await expect(page).toHaveURL('/levels/speed-race')
	await expect(page.getByRole('heading', { name: 'Speed Race', level: 1 })).toBeVisible()
	await expect(page.getByText(/Beginner mode\. Every result here is a replay/)).toBeVisible()

	await page.getByRole('button', { name: 'Make your prediction' }).click()
	await expect(page).toHaveURL(/step=predict/)
	await predictJevEverywhere(page)
	// Enter locks in the prediction.
	await page.getByRole('radio', { name: 'Jev' }).last().press('Enter')
	await expect(page).toHaveURL(/step=play/)

	// Opus 5.5 is the default opponent; every racer shows its mode label.
	await expect(opponentButton(page)).toHaveText(/Claude Opus 5\.5/)
	await expect(page.getByText(/Beginner mode - recorded \d{4}-\d{2}-\d{2} - jev-/)).toBeVisible()
	await expect(
		page.getByText(/Beginner mode - recorded \d{4}-\d{2}-\d{2} - claude-opus-5-5/)
	).toBeVisible()

	await page.getByRole('button', { name: 'Start the race' }).click()
	await expect(page.getByText('Racing at the recorded speed...')).toBeVisible()
	await page.getByRole('button', { name: 'Skip to result' }).click()
	await expect(page.getByText('Finished. These are the recorded numbers.')).toBeVisible()
	await expect(page.getByRole('table', { name: 'Final numbers from the recordings' })).toBeVisible()

	await page.getByRole('button', { name: 'See the result' }).click()
	await expect(page).toHaveURL(/step=reveal/)
	await expect(page.getByRole('heading', { name: 'What happened' })).toBeVisible()
	// Recorded: Jev is faster and cheaper than Opus 5.5, and both get 39 of 40 right.
	const verdicts = page.getByRole('list', { name: 'Your prediction' })
	await expect(verdicts.getByText('You got it')).toHaveCount(2)
	await expect(verdicts.getByText("It's a tie")).toHaveCount(1)
	const scoreboard = page.getByRole('table', { name: /Every recorded model on the same 40 items/ })
	await expect(scoreboard.getByRole('row')).toHaveCount(5)

	// Misses that didn't parse are shown with their raw text (R44).
	await page.getByText('See every item').click()
	await expect(page.getByText("Couldn't parse", { exact: true }).first()).toBeVisible()

	await page.getByRole('button', { name: 'Race again' }).click()
	await expect(page).toHaveURL(/step=play/)
})

test('the opponent picker works by mouse and by keyboard', async ({ page }) => {
	await signIn(page, EMAIL)
	await page.goto('/levels/speed-race?step=play')

	// A real mouse click on the option's text picks it.
	await opponentButton(page).click()
	await page.getByRole('dialog').getByText('Claude Haiku 4.5').click()
	await expect(opponentButton(page)).toHaveText(/Claude Haiku 4\.5/)
	await expect(page.getByRole('radio')).toHaveCount(0)

	// Reopened, focus starts on the current pick; arrows move, Enter picks.
	await opponentButton(page).click()
	await expect(page.getByRole('radio', { name: 'Claude Haiku 4.5' })).toBeFocused()
	await page.keyboard.press('ArrowUp')
	await expect(page.getByRole('radio', { name: 'Claude Sonnet 5.5' })).toBeFocused()
	await expect(opponentButton(page)).toHaveText(/Claude Haiku 4\.5/)
	await page.keyboard.press('Enter')
	await expect(opponentButton(page)).toHaveText(/Claude Sonnet 5\.5/)

	// Esc closes without changing the pick.
	await opponentButton(page).click()
	await page.keyboard.press('ArrowDown')
	await page.keyboard.press('Escape')
	await expect(page.getByRole('radio')).toHaveCount(0)
	await expect(opponentButton(page)).toHaveText(/Claude Sonnet 5\.5/)
})

test('a race replays at the recorded speed when not skipped', async ({ page }) => {
	await signIn(page, EMAIL)
	await page.goto('/levels/speed-race?step=play')
	await opponentButton(page).click()
	await page.getByRole('dialog').getByText('Claude Haiku 4.5').click()
	await page.getByRole('button', { name: 'Start the race' }).click()
	// Haiku 4.5 took about 7.6 s and Jev about 4.2 s, so the race is still on after 2 s.
	await page.waitForTimeout(2_000)
	await expect(page.getByText('Racing at the recorded speed...')).toBeVisible()
	await expect(page.getByText('Finished. These are the recorded numbers.')).toBeVisible({
		timeout: 20_000
	})
})

for (const [name, viewport] of Object.entries(VIEWPORTS)) {
	for (const scheme of COLOR_SCHEMES) {
		test(`screenshots: level 1 ${name} ${scheme}`, async ({ page }) => {
			await page.setViewportSize(viewport)
			await page.emulateMedia({ colorScheme: scheme })
			await signIn(page, EMAIL)
			const shot = async (step: string) => {
				await expectNoHorizontalScroll(page)
				await page.screenshot({
					path: `${SCREENSHOT_DIR}/level-1-${step}-${name}-${scheme}.png`,
					fullPage: true
				})
			}
			await page.goto('/levels/speed-race')
			await expect(page.getByRole('heading', { name: 'Learn' })).toBeVisible()
			await shot('learn')
			await page.getByRole('button', { name: 'Make your prediction' }).click()
			await predictJevEverywhere(page)
			await shot('predict')
			await page.getByRole('button', { name: /^(Lock in my prediction|Back to the race)$/ }).click()
			await page.getByRole('button', { name: 'Start the race' }).click()
			await page.waitForTimeout(1_500)
			await shot('race-running')
			await page.getByRole('button', { name: 'Skip to result' }).click()
			await expect(page.getByText('Finished. These are the recorded numbers.')).toBeVisible()
			// Let the progress bars finish their width animation.
			await page.waitForTimeout(1_000)
			await shot('race-finished')
			await page.getByRole('button', { name: 'See the result' }).click()
			await expect(page.getByRole('heading', { name: 'What happened' })).toBeVisible()
			await shot('reveal')
		})
	}
}
