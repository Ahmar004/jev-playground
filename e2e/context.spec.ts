import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'
import {
	captureScheme,
	COLOR_SCHEMES,
	expectNoHorizontalScroll,
	freshEmail,
	SCREENSHOT_DIR,
	setColorScheme,
	signUp,
	VIEWPORTS
} from './helpers'

// The context added in Steps 37-41: Reveal's note, the "Game" wording, every game's brief and
// item list, and the Arena's brief, answers in words, fan-out breakdown and batch item list.
const EMAIL = freshEmail()
const REPLAY_TIMEOUT = 20_000
const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']
const SETTLE_MS = 1500

async function expectNoAxeViolations(label: string) {
	await page.waitForTimeout(SETTLE_MS)
	const { violations } = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze()
	expect(violations.map((v) => `${label}: ${v.id} ${v.nodes[0]?.target.join(' ')}`)).toEqual([])
}

test.describe.configure({ mode: 'serial' })

let page: Page
test.beforeAll(async ({ browser }) => {
	page = await (await browser.newContext()).newPage()
	await signUp(page, EMAIL)
})
test.afterAll(async () => {
	await page.context().close()
})
test.beforeEach(async () => {
	await page.setViewportSize(VIEWPORTS.desktop)
	await setColorScheme(page, 'light')
})

async function replayPreset(presetId: string) {
	await page.goto(`/arena?preset=${presetId}`)
	await page.getByRole('button', { name: 'Run both' }).click()
	await expect(page.getByRole('button', { name: 'Run again' })).toBeVisible({
		timeout: REPLAY_TIMEOUT
	})
}

test('Step-37: Reveal says what "See every item" holds, and opens from the note too', async () => {
	await page.goto('/levels/speed-race?step=play')
	await page.getByRole('button', { name: 'Start the race' }).click()
	await page.getByRole('button', { name: 'Skip to result' }).click()
	await page.getByRole('button', { name: 'See the result' }).click()
	const note = page.getByText('Open this to see the results for each individual item.')
	await expect(note).toBeVisible()
	await note.click()
	await expect(page.getByText("Couldn't parse", { exact: true }).first()).toBeVisible()
})

test('Step-38: the feature is called Game, with no "VS" left in the UI', async () => {
	await page.goto('/games')
	await expect(page.getByRole('heading', { name: 'Games', exact: true })).toBeVisible()
	await expect(page.getByText(/\bVS\b/)).toHaveCount(0)
	await page.goto('/glossary')
	await expect(page.getByText('Game', { exact: true }).first()).toBeVisible()
	await expect(page.getByText('VS game')).toHaveCount(0)
})

test('Step-40: a game shows what both racers get and every item with its answers', async () => {
	await page.goto('/games/guardrail-gauntlet')
	const brief = page.getByRole('region', { name: 'What Jev and the LLM are asked' })
	await expect(brief.getByText(/each of the 16 messages/)).toBeVisible()
	await expect(brief.getByText('Block', { exact: true })).toBeVisible()
	const items = page.locator('details').filter({ hasText: 'See all 16 messages and every answer' })
	await expect(items).toBeVisible()
	await page.getByRole('button', { name: 'Start the race' }).click()
	await page.getByRole('button', { name: 'Skip to result' }).click()
	await items.locator('summary').click()
	await expect(items.locator('ol > li')).toHaveCount(16)
	await expect(items.getByText('Not answered yet')).toHaveCount(0)
	await expect(items.getByText('Right answer:').first()).toBeVisible()

	// Number Crunch adds Code's answers once Code has run after the race.
	await page.goto('/games/number-crunch')
	await page.getByRole('button', { name: 'Start the race' }).click()
	await page.getByRole('button', { name: 'Skip to result' }).click()
	const crunch = page.locator('details').filter({ hasText: /See all \d+ problems/ })
	await crunch.locator('summary').click()
	await expect(crunch.locator('ol > li').first().getByText('Code', { exact: true })).toBeVisible()
	await page.setViewportSize(VIEWPORTS.phone)
	await expectNoHorizontalScroll(page)
})

test('Step-41: a preset shows its options and answers in its own words', async () => {
	await page.goto('/arena?preset=review-rating')
	await expect(page.getByRole('heading', { name: 'What Jev and the LLM are asked' })).toBeVisible()
	await expect(page.getByText(/Very negative: the reviewer is angry/)).toBeVisible()
	await replayPreset('review-rating')
	await expect(page.getByText('Expected answer:')).toContainText('Positive')

	// Named fields, not raw JSON, and the Noul's own words.
	await page.goto('/arena?preset=product-match')
	await expect(page.getByText('Shop A:')).toBeVisible()
	await expect(page.getByText('"shopA"')).toHaveCount(0)
	await expect(page.getByText('Same product', { exact: true })).toBeVisible()
	await replayPreset('product-match')
	await expect(page.getByText('Probability yes (Same product)')).toBeVisible()
	await expect(page.getByText('Expected answer:')).toContainText('Different products')

	// Ticket triage's option keys read as words.
	await replayPreset('ticket-triage')
	await expect(page.getByText('Expected answer:')).toContainText('Feature request')
})

test('Step-41: the phishing fan-out lists its questions and scores each one', async () => {
	await page.goto('/arena?preset=phishing-fan-out')
	await expect(page.getByText(/the same 10 yes or no questions/)).toBeVisible()
	await replayPreset('phishing-fan-out')
	const table = page.getByRole('region', { name: 'Question by question' })
	await expect(table).toBeVisible()
	await expect(table.locator('ol > li')).toHaveCount(10)
	await expect(table.getByText(/Jev: \d+ of 10 right/)).toBeVisible()
	await page.setViewportSize(VIEWPORTS.phone)
	await expectNoHorizontalScroll(page)
})

test('Step-41: a batch page has the brief and the item list', async () => {
	await page.goto('/arena/batch/ticket-triage')
	await expect(page.getByRole('region', { name: 'What Jev and the LLM are asked' })).toBeVisible()
	const items = page.locator('details').filter({ hasText: 'See all 40 tickets and every answer' })
	await page.getByRole('button', { name: 'Start the race' }).click()
	await page.getByRole('button', { name: 'Skip to result' }).click()
	await items.locator('summary').click()
	await expect(items.locator('ol > li')).toHaveCount(40)
	await expect(items.getByText('Not answered yet')).toHaveCount(0)
})

test('axe finds no WCAG 2.1 AA violations in the opened new context, in both themes', async () => {
	for (const scheme of COLOR_SCHEMES) {
		await setColorScheme(page, scheme)
		await replayPreset('phishing-fan-out')
		await expectNoAxeViolations(`${scheme} fan-out`)
		await page.goto('/games/citation-cop')
		await page.getByRole('button', { name: 'Start the race' }).click()
		await page.getByRole('button', { name: 'Skip to result' }).click()
		await page.locator('details').filter({ hasText: 'See all' }).locator('summary').click()
		await expectNoAxeViolations(`${scheme} game items`)
		await page.goto('/arena/batch/intent-routing')
		await page.getByRole('button', { name: 'Start the race' }).click()
		await page.getByRole('button', { name: 'Skip to result' }).click()
		await page.locator('details').filter({ hasText: 'See all' }).locator('summary').click()
		await expectNoAxeViolations(`${scheme} batch items`)
	}
	// The quiz retry screen: take the start quiz once, then retry it.
	await page.goto('/quizzes/start')
	for (let index = 0; index < 8; index++) {
		await page.getByRole('radio', { name: 'Jev', exact: true }).check()
		await page.getByRole('button', { name: index === 7 ? 'Submit quiz' : 'Next' }).click()
	}
	await expect(page.getByRole('heading', { name: /You scored/ })).toBeVisible()
	await expectNoAxeViolations('quiz results')
	await page.getByRole('button', { name: 'Retry quiz' }).first().click()
	await expect(page.getByText('You are retrying this quiz.')).toBeVisible()
	await expectNoAxeViolations('quiz retry')
})

test('screenshots of the new context in both themes at desktop and phone width', async () => {
	for (const scheme of COLOR_SCHEMES) {
		for (const [name, size] of Object.entries(VIEWPORTS)) {
			await page.setViewportSize(size)
			await setColorScheme(page, scheme)
			await replayPreset('phishing-fan-out')
			await expectNoHorizontalScroll(page)
			await captureScheme(page, scheme, {
				path: `${SCREENSHOT_DIR}/context-arena-fan-out-${scheme}-${name}.png`,
				fullPage: true
			})
			await replayPreset('product-match')
			await captureScheme(page, scheme, {
				path: `${SCREENSHOT_DIR}/context-arena-product-match-${scheme}-${name}.png`,
				fullPage: true
			})
			await page.goto('/games/twin-finder')
			await page.getByRole('button', { name: 'Start the race' }).click()
			await page.getByRole('button', { name: 'Skip to result' }).click()
			await page.locator('details').filter({ hasText: 'See all' }).locator('summary').click()
			await expectNoHorizontalScroll(page)
			await captureScheme(page, scheme, {
				path: `${SCREENSHOT_DIR}/context-game-items-${scheme}-${name}.png`,
				fullPage: true
			})
		}
	}
})
