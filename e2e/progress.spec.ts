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

const LEVEL_URL = '/levels/speed-race'
const TOOL_FIT = /Your shop gets 50,000 support tickets/
const LLM_COST = /Why did the LLM cost more per ticket/

// Home has its own bar, so the header one is scoped by the banner landmark.
const headerBar = (page: Page) =>
	page.getByRole('banner').getByRole('progressbar', { name: 'Path progress' })
// The form holds the fieldset, the Check answer button and the result.
const question = (page: Page, prompt: RegExp) =>
	page.locator('form').filter({ has: page.getByRole('group', { name: prompt }) })

async function lockInJevEverywhere(page: Page) {
	await expect(page.getByRole('heading', { name: 'Predict' })).toBeVisible()
	for (const group of await page.getByRole('group').all()) {
		await group.getByRole('radio', { name: 'Jev' }).check()
	}
	await page.getByRole('button', { name: 'Lock in my prediction' }).click()
	await expect(page).toHaveURL(/step=play/)
}

async function raceToReveal(page: Page) {
	await page.getByRole('button', { name: 'Start the race' }).click()
	await page.getByRole('button', { name: 'Skip to result' }).click()
	await page.getByRole('button', { name: 'See the result' }).click()
	await expect(page.getByRole('heading', { name: 'What happened' })).toBeVisible()
}

test.describe('flow 1: first level, prediction, check, XP and badge', () => {
	test.describe.configure({ mode: 'serial' })
	const email = freshEmail()

	test.beforeAll(async ({ browser }) => {
		const page = await browser.newPage()
		await signUp(page, email)
		await page.close()
	})

	test('play level 1 through to Level complete', async ({ page }) => {
		await signIn(page, email)
		await expect(page.getByText('0 of 1 levels done')).toBeVisible()
		await expect(headerBar(page)).toHaveAttribute('aria-valuenow', '0')
		await expect(page.getByRole('banner').getByRole('link', { name: /0\/1/ })).toBeVisible()

		await page.getByRole('link', { name: 'Play level 1: Speed Race' }).click()
		await expect(page).toHaveURL(LEVEL_URL)
		await page.getByRole('button', { name: 'Make your prediction' }).click()
		await lockInJevEverywhere(page)
		await raceToReveal(page)

		const verdicts = page.getByRole('list', { name: 'Your prediction' })
		await expect(verdicts.getByText('You got it')).toHaveCount(2)
		await expect(page.getByText('+25 XP', { exact: true })).toBeVisible()

		await page.getByRole('button', { name: 'Check what you learned' }).click()
		await expect(page).toHaveURL(/step=check/)
		await expect(page.getByRole('heading', { name: 'Check' })).toBeVisible()

		const first = question(page, TOOL_FIT)
		await first.getByRole('radio', { name: /^Jev: one typed Choice/ }).check()
		await first.getByRole('button', { name: 'Check answer' }).click()
		await expect(first.getByText('Right', { exact: true })).toBeVisible()
		await expect(page.getByText('+20 XP', { exact: true })).toBeVisible()

		const second = question(page, LLM_COST)
		await second.getByRole('radio', { name: /^It got tickets wrong/ }).check()
		await second.getByRole('button', { name: 'Check answer' }).click()
		await expect(second.getByText('Not quite')).toBeVisible()
		await expect(second.getByText(/The answer: It pays for the tokens it writes/)).toBeVisible()

		// A retry is practice only and says so.
		await second.getByRole('button', { name: 'Try again' }).click()
		await second.getByRole('radio', { name: /^It pays for the tokens it writes/ }).check()
		await second.getByRole('button', { name: 'Check answer' }).click()
		await expect(second.getByText('Right', { exact: true })).toBeVisible()
		await expect(
			second.getByText('Practice only: your first answer is the one that counts.')
		).toBeVisible()

		await expect(page.getByText('Level complete')).toBeVisible()
		await expect(page.getByText('+100 XP', { exact: true })).toBeVisible()
		await expect(page.getByText('Badge earned: First Race', { exact: true })).toBeVisible()
		await expect(headerBar(page)).toHaveAttribute('aria-valuenow', '1')
		await expect(page.getByRole('banner').getByRole('link', { name: /1\/1/ })).toBeVisible()

		await page.getByRole('button', { name: 'Back to Path' }).click()
		await expect(page).toHaveURL('/path')
		await expect(page.getByText('Done', { exact: true })).toBeVisible()

		// Back and the header link are client navigations: Path must show the server's status.
		await page.goBack()
		await expect(page).toHaveURL(/step=check/)
		await page.getByRole('link', { name: 'Path', exact: true }).click()
		await expect(page).toHaveURL('/path')
		await expect(page.getByText('Done', { exact: true })).toBeVisible()
		await expect(page.getByRole('button', { name: 'Skip' })).toHaveCount(0)
	})

	test('Home shows 145 XP and the First Race badge', async ({ page }) => {
		await signIn(page, email)
		await expect(page.getByText('1 of 1 levels done')).toBeVisible()
		await expect(page.getByText('145 XP')).toBeVisible()
		await expect(
			page.getByRole('list', { name: 'Badges earned' }).getByText('First Race')
		).toBeVisible()
	})

	test('a replay awards nothing again', async ({ page }) => {
		await signIn(page, email)
		// The picks were fixed at the first Reveal, so Predict shows them locked.
		await page.goto(`${LEVEL_URL}?step=predict`)
		await expect(page.getByRole('radio', { name: 'Jev' }).first()).toBeDisabled()
		await page.getByRole('button', { name: 'Back to the race' }).click()
		await expect(page).toHaveURL(/step=play/)
		await raceToReveal(page)
		await expect(page.getByRole('list', { name: 'Your prediction' })).toBeVisible()
		// Give a wrongly fired toast time to appear before asserting none did.
		await page.waitForTimeout(1_000)
		await expect(page.getByText(/^\+\d+ XP$/)).toHaveCount(0)

		await page.getByRole('button', { name: 'Check what you learned' }).click()
		// Revisits show the stored answers, so there is nothing left to submit.
		await expect(page.getByRole('button', { name: 'Check answer' })).toHaveCount(0)
		await expect(page.getByText('Level complete')).toBeVisible()
		await page.waitForTimeout(500)
		await expect(page.getByText(/^\+\d+ XP$/)).toHaveCount(0)

		await page.goto('/')
		await expect(page.getByText('145 XP')).toBeVisible()
	})
})

test('reload keeps a locked-in prediction', async ({ page, browser }) => {
	const setup = await browser.newPage()
	const email = freshEmail()
	await signUp(setup, email)
	await setup.close()

	await signIn(page, email)
	await page.goto(`${LEVEL_URL}?step=predict`)
	await lockInJevEverywhere(page)

	await page.goto(`${LEVEL_URL}?step=predict`)
	await expect(page.getByRole('heading', { name: 'Predict' })).toBeVisible()
	const groups = await page.getByRole('group').all()
	expect(groups.length).toBeGreaterThan(0)
	for (const group of groups) {
		await expect(group.getByRole('radio', { name: 'Jev' })).toBeChecked()
	}
})

test('flow 2: skip level 1 on the Path, revisit it and start it', async ({ page, browser }) => {
	const setup = await browser.newPage()
	const email = freshEmail()
	await signUp(setup, email)
	await setup.close()

	await signIn(page, email)
	await page.getByRole('link', { name: 'Path', exact: true }).click()
	await expect(page).toHaveURL('/path')
	await expect(page.getByText('Not started')).toBeVisible()

	await page.getByRole('button', { name: 'Skip' }).click()
	await expect(page.getByText('Skipped', { exact: true })).toBeVisible()
	await expect(page.getByText('Level skipped', { exact: true })).toBeVisible()

	await page.getByRole('link', { name: 'Revisit' }).click()
	await expect(page).toHaveURL(LEVEL_URL)
	await page.getByRole('button', { name: 'Make your prediction' }).click()
	await lockInJevEverywhere(page)

	// The header link is a client navigation: Path must show the server's status, not a stale one.
	await page.getByRole('link', { name: 'Path', exact: true }).click()
	await expect(page).toHaveURL('/path')
	await expect(page.getByText('In progress')).toBeVisible()
})

test.describe('progress screenshots', () => {
	test.describe.configure({ mode: 'serial' })
	const email = freshEmail()

	test.beforeAll(async ({ browser }) => {
		const page = await browser.newPage()
		await signUp(page, email)
		// Finish level 1 so Home and Path show real progress.
		await page.goto(LEVEL_URL)
		await page.getByRole('button', { name: 'Make your prediction' }).click()
		await lockInJevEverywhere(page)
		await raceToReveal(page)
		await page.getByRole('button', { name: 'Check what you learned' }).click()
		for (const [prompt, option] of [
			[TOOL_FIT, /^Jev: one typed Choice/],
			[LLM_COST, /^It got tickets wrong/]
		] as const) {
			const group = question(page, prompt)
			await group.getByRole('radio', { name: option }).check()
			await group.getByRole('button', { name: 'Check answer' }).click()
		}
		await expect(page.getByText('Badge earned: First Race', { exact: true })).toBeVisible()
		await page.close()
	})

	for (const [name, viewport] of Object.entries(VIEWPORTS)) {
		for (const scheme of COLOR_SCHEMES) {
			test(`screenshots: path, home and check ${name} ${scheme}`, async ({ page }) => {
				await page.setViewportSize(viewport)
				await page.emulateMedia({ colorScheme: scheme })
				await signIn(page, email)
				const shot = async (label: string) => {
					await expectNoHorizontalScroll(page)
					await page.screenshot({
						path: `${SCREENSHOT_DIR}/${label}-${name}-${scheme}.png`,
						fullPage: true
					})
				}
				await expect(page.getByText('145 XP')).toBeVisible()
				await shot('home-progress')
				await page.goto('/path')
				await expect(page.getByText('Done', { exact: true })).toBeVisible()
				await shot('path')
				await page.goto(`${LEVEL_URL}?step=check`)
				await expect(page.getByRole('heading', { name: 'Check' })).toBeVisible()
				await expect(page.getByText('Level complete')).toBeVisible()
				await shot('level-1-check')
			})
		}
	}
})
