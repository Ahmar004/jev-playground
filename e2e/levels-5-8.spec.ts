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

async function openStep(page: Page, levelId: string, step: string) {
	await page.goto(`/levels/${levelId}?step=${step}`)
	await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
}

// The tool each Router card suits best, as the level's content says.
const ROUTER_PICKS = [
	['Sort a support message', 'Jev'],
	['Add two numbers', 'Code'],
	['Write a poem', 'LLM'],
	['Spot a scam message', 'Jev'],
	['Which date is first', 'Code'],
	['Summarize a paragraph', 'LLM']
] as const

test('level 5: weights change the score without a new call', async ({ page }) => {
	await signIn(page, EMAIL)
	await openStep(page, 'break-it-down', 'play')
	await expect(page.getByRole('heading', { name: 'Set the weights' })).toBeVisible()
	const scores = page.getByText(/^Score: /)
	const before = await scores.allTextContents()
	const sliders = page.getByRole('slider')
	await expect(sliders).toHaveCount(5)
	await sliders.nth(0).fill('0')
	await sliders.nth(1).fill('0')
	await sliders.nth(2).fill('0')
	await expect.poll(() => scores.allTextContents()).not.toEqual(before)
	for (const index of [3, 4]) await sliders.nth(index).fill('0')
	await expect(page.getByRole('status').filter({ hasText: 'Every weight is 0' })).toBeVisible()
	await sliders.nth(4).fill('3')
	await expect(page.getByRole('status').filter({ hasText: 'Every weight is 0' })).toHaveCount(0)
	await expect(page.getByRole('heading', { name: 'One broad question' })).toBeVisible()
	await page.getByRole('button', { name: 'Start the race' }).first().click()
	await page.getByRole('button', { name: 'Skip to result' }).click()
	await page.getByRole('button', { name: 'See the result' }).click()
	await expect(page.getByRole('heading', { name: 'What happened' })).toBeVisible()
	await expect(page.getByRole('row', { name: /Jev \+ Code/ })).toHaveCount(1)
})

test('level 6: sort the cards by tap, run the pipeline, see every tool', async ({ page }) => {
	await signIn(page, EMAIL)
	await openStep(page, 'the-router', 'play')
	await expect(page.getByRole('heading', { name: 'Sort the cards' })).toBeVisible()
	const run = page.getByRole('button', { name: 'Run the pipeline' })
	await expect(run).toBeDisabled()
	for (const [title, tool] of ROUTER_PICKS) {
		await page.getByRole('button', { name: `Send ${title} to ${tool}` }).click()
	}
	await expect(page.getByText('6 of 6 sorted')).toBeVisible()
	await expect(run).toBeEnabled()
	await run.click()
	const results = page.getByRole('list', { name: 'Results for each card' })
	await expect(results.getByText(/^Right tool:/)).toHaveCount(6)
	// Code has no rule for a poem, and Jev's real rejection is shown (R44).
	await expect(results.getByText('Code has no rule for this job.').first()).toBeVisible()
	await page.getByRole('button', { name: 'See the result' }).click()
	await expect(page.getByRole('heading', { name: 'What happened' })).toBeVisible()
	await expect(page.getByRole('list', { name: 'Results for each card' })).toBeVisible()
})

test('level 6: a card can also be dragged onto a tool', async ({ page }) => {
	await page.setViewportSize({ width: 1280, height: 2400 })
	await signIn(page, EMAIL)
	await openStep(page, 'the-router', 'play')
	const handle = page.getByRole('button', { name: 'Drag the card Add two numbers' })
	const zone = page.getByRole('region', { name: 'Code' })
	const from = await handle.boundingBox()
	const to = await zone.boundingBox()
	if (!from || !to) throw new Error('missing boxes')
	await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2)
	await page.mouse.down()
	await page.mouse.move(from.x + 20, from.y + 20, { steps: 5 })
	await page.mouse.move(to.x + to.width / 2, to.y + 40, { steps: 15 })
	await page.mouse.up()
	await expect(page.getByText('1 of 6 sorted')).toBeVisible()
	await expect(page.getByRole('button', { name: 'Send Add two numbers to Code' })).toHaveAttribute(
		'aria-pressed',
		'true'
	)
})

test('level 7: every sign lights up with its probability', async ({ page }) => {
	await signIn(page, EMAIL)
	await openStep(page, 'spot-the-phish', 'reveal')
	await expect(page.getByRole('heading', { name: 'Every sign, one email at a time' })).toBeVisible()
	await expect(page.getByText(/^Jev: \d+% \((lit|not lit)\)/)).toHaveCount(10)
	await page.getByRole('button', { name: 'Email 3' }).click()
	await expect(
		page.locator('section[aria-labelledby="signals-heading"]').getByText(/Bright Books/)
	).toBeVisible()
})

test('level 8: guess which tricks fool Jev, then see what happened', async ({ page }) => {
	await signIn(page, EMAIL)
	await openStep(page, 'trick-jev', 'play')
	await expect(page.getByRole('heading', { name: 'Which tricks fool Jev?' })).toBeVisible()
	await page.getByRole('radio', { name: 'Jev sees through it' }).first().check()
	await expect(page.getByText('1 of 6 guessed')).toBeVisible()
	for (const radio of await page.getByRole('radio', { name: 'Jev sees through it' }).all()) {
		await radio.check()
	}
	await page.getByRole('button', { name: 'See the result' }).click()
	await expect(
		page.getByRole('heading', { name: 'Your guesses against what happened' })
	).toBeVisible()
	// Recorded: the tricky wording of one pair fooled Jev.
	await expect(page.getByText('Jev was fooled by 1 of 6 tricky messages')).toBeVisible()
	await expect(page.getByText('You called it').first()).toBeVisible()
})

for (const [name, viewport] of Object.entries(VIEWPORTS)) {
	for (const scheme of COLOR_SCHEMES) {
		test(`screenshots: levels 5-8 ${name} ${scheme}`, async ({ page }) => {
			await page.setViewportSize(viewport)
			await page.emulateMedia({ colorScheme: scheme })
			await signIn(page, EMAIL)
			for (const [levelId, step] of [
				['break-it-down', 'play'],
				['break-it-down', 'reveal'],
				['the-router', 'play'],
				['the-router', 'reveal'],
				['spot-the-phish', 'reveal'],
				['trick-jev', 'play'],
				['trick-jev', 'reveal']
			] as const) {
				await openStep(page, levelId, step)
				await page.waitForTimeout(800)
				await expectNoHorizontalScroll(page)
				await page.screenshot({
					path: `${SCREENSHOT_DIR}/${levelId}-${step}-${name}-${scheme}.png`,
					fullPage: true
				})
			}
		})
	}
}
