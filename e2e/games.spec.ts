import { expect, test } from '@playwright/test'
import {
	captureScheme,
	COLOR_SCHEMES,
	expectNoHorizontalScroll,
	freshEmail,
	setColorScheme,
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

test('the Leaderboard starts empty and points to the games', async ({ page }) => {
	await signIn(page, EMAIL)
	await page.getByRole('link', { name: 'Leaderboard' }).first().click()
	await expect(page).toHaveURL('/leaderboard')
	await expect(page.getByText(/Nothing here yet/)).toBeVisible()
	await page.getByRole('link', { name: 'Play a VS game' }).click()
	await expect(page).toHaveURL('/games')
	await expect(page.getByRole('link', { name: /Guardrail Gauntlet/ })).toBeVisible()
})

test('flow 3: play a game, switch the opponent, skip to the result, see the Leaderboard', async ({
	page
}) => {
	await signIn(page, EMAIL)
	await page.goto('/games/review-tug-of-war')
	await expect(page.getByRole('heading', { name: 'Review Tug-of-War', level: 1 })).toBeVisible()
	await expect(page.getByRole('button', { name: /^Opponent:/ })).toHaveText(/Claude Opus 5\.5/)

	// Switching the opponent restarts the race from the Sonnet recording.
	await page.getByRole('button', { name: /^Opponent:/ }).click()
	await page.getByRole('dialog').getByText('Claude Sonnet 5.5').click()
	await expect(page.getByRole('button', { name: /^Opponent:/ })).toHaveText(/Claude Sonnet 5\.5/)

	await page.getByRole('button', { name: 'Start the race' }).click()
	await page.getByRole('button', { name: 'Skip to result' }).click()
	await expect(page.getByRole('region', { name: 'Result', exact: true })).toBeVisible()
	await expect(
		page
			.getByRole('region', { name: 'Result', exact: true })
			.getByText(/Beginner|won|tie/i)
			.first()
	).toBeVisible()
	// The first finished run of a game earns its XP, and the run is saved.
	await expect(page.getByText('+50 XP', { exact: true }).first()).toBeVisible()
	await expect(page.getByText('Saved to your Leaderboard', { exact: true }).first()).toBeVisible()

	await page.getByRole('link', { name: 'See your Leaderboard' }).click()
	await expect(page).toHaveURL('/leaderboard')
	const section = page.getByRole('region', { name: 'Review Tug-of-War', exact: true })
	await expect(section.getByRole('row', { name: /Jev/ })).toContainText('Beginner mode')
	await expect(section.getByRole('row', { name: /Claude Sonnet 5\.5/ })).toContainText(
		'Beginner mode'
	)
})

test('number crunch shows Code beside the models in its summary', async ({ page }) => {
	await signIn(page, EMAIL)
	await page.goto('/games/number-crunch')
	await page.getByRole('button', { name: 'Start the race' }).click()
	await page.getByRole('button', { name: 'Skip to result' }).click()
	const result = page.getByRole('region', { name: 'Result', exact: true })
	await expect(result.getByRole('row', { name: /^Code/ })).toContainText('12 of 12')
})

test('a game works at phone width without horizontal scroll', async ({ page }) => {
	await page.setViewportSize(VIEWPORTS.phone)
	await signIn(page, EMAIL)
	await page.goto('/games/guardrail-gauntlet')
	await expectNoHorizontalScroll(page)
	await page.getByRole('button', { name: 'Start the race' }).click()
	await page.getByRole('button', { name: 'Skip to result' }).click()
	await expect(page.getByRole('region', { name: 'Result', exact: true })).toBeVisible()
	await expectNoHorizontalScroll(page)
	await page.goto('/leaderboard')
	await expectNoHorizontalScroll(page)
})

test('the four P1 games play and write Leaderboard entries; Confidence Catch has a threshold', async ({
	page
}) => {
	await signIn(page, EMAIL)
	const titles = ['Smart Home Dash', 'Twin Finder', 'Confidence Catch', 'Citation Cop']
	await page.goto('/games')
	for (const title of titles) {
		await expect(page.getByRole('link', { name: new RegExp(title) })).toBeVisible()
	}
	const slugs = ['smart-home-dash', 'twin-finder', 'confidence-catch', 'citation-cop']
	for (const slug of slugs) {
		await page.goto(`/games/${slug}`)
		await page.getByRole('button', { name: 'Start the race' }).click()
		await page.getByRole('button', { name: 'Skip to result' }).click()
		await expect(page.getByRole('region', { name: 'Result', exact: true })).toBeVisible()
		await expect(page.getByText('Saved to your Leaderboard', { exact: true }).first()).toBeVisible()
	}
	// Confidence Catch: the slider re-sorts Jev's recorded answers.
	await page.goto('/games/confidence-catch')
	await page.getByRole('button', { name: 'Start the race' }).click()
	await page.getByRole('button', { name: 'Skip to result' }).click()
	const panel = page.getByRole('region', { name: 'Set the confidence threshold' })
	await expect(panel).toBeVisible()
	await panel.getByRole('slider').fill('0')
	// The scene above re-sorts with the slider: nothing is sent to a person at 0%.
	await expect(page.getByText(/0 sent to a person/).first()).toBeVisible()
	await expect(panel.getByText('Sent to a person').locator('..')).toContainText('0 of 20')
	await panel.getByRole('slider').fill('100')
	await expect(panel.getByText('Acted on, wrong').locator('..')).toContainText('0 of 20')

	await page.goto('/leaderboard')
	for (const title of titles) {
		await expect(page.getByRole('region', { name: title, exact: true })).toBeVisible()
	}
})

// Each game draws its own scene from the finished race (ROADMAP Steps 33 and 34).
const GAME_SCENES = [
	{ slug: 'guardrail-gauntlet', title: 'Guardrail Gauntlet', text: /Threats stopped \d+ of \d+/ },
	{ slug: 'needle-hunt', title: 'Needle Hunt', text: /picked \d+ lines/ },
	{ slug: 'number-crunch', title: 'Number Crunch Showdown', text: /\d+ of 12 hit points/ },
	{ slug: 'review-tug-of-war', title: 'Review Tug-of-War', text: /\d+ pulls/ },
	{ slug: 'smart-home-dash', title: 'Smart Home Dash', text: /commands reached the right device/ },
	{ slug: 'twin-finder', title: 'Twin Finder', text: /Different pairs caught \d+ of \d+/ },
	{ slug: 'confidence-catch', title: 'Confidence Catch', text: /\d+ acted on, \d+ of them wrong/ },
	{ slug: 'citation-cop', title: 'Citation Cop', text: /Bad citations flagged \d+ of \d+/ }
]

for (const scene of GAME_SCENES) {
	for (const [size, viewport] of Object.entries(VIEWPORTS)) {
		for (const scheme of COLOR_SCHEMES) {
			test(`${scene.slug} scene at ${size} width in ${scheme}`, async ({ page }) => {
				await page.setViewportSize(viewport)
				await setColorScheme(page, scheme)
				await signIn(page, EMAIL)
				await page.goto(`/games/${scene.slug}`)
				await page.getByRole('button', { name: 'Start the race' }).click()
				await page.getByRole('button', { name: 'Skip to result' }).click()
				const picture = page.getByRole('group', { name: new RegExp(`^${scene.title} scene`) })
				await expect(picture.getByText(scene.text).first()).toBeVisible()
				await expect(page.getByRole('region', { name: 'Result', exact: true })).toBeVisible()
				await expectNoHorizontalScroll(page)
				await picture.scrollIntoViewIfNeeded()
				await captureScheme(page, scheme, {
					path: `${SCREENSHOT_DIR}/${scene.slug}-scene-${size}-${scheme}.png`
				})
			})
		}
	}
}
