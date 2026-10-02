import { expect, test, type Page, type Route } from '@playwright/test'
import {
	COLOR_SCHEMES,
	expectNoHorizontalScroll,
	freshEmail,
	SCREENSHOT_DIR,
	signIn,
	signUp,
	VIEWPORTS
} from './helpers'

// Flow 5 (DESIGN 14): Arena preset > Share > open /s/<id> signed out > delete > the link is gone.
const EMAIL = freshEmail()
const TS_KEY = 'ts-e2e-fake-key-0001'
const ANTHROPIC_KEY = 'sk-ant-e2e-fake-key-0002'
const CORS = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*' }
const SCRIPT_TEXT = '<img src=x onerror="window.__xss=1"> The soup was cold.'

test.describe.configure({ mode: 'serial' })

test.beforeAll(async ({ browser }) => {
	const page = await browser.newPage()
	await signUp(page, EMAIL)
	await page.close()
})

function json(route: Route, status: number, body: unknown, headers: Record<string, string> = {}) {
	return route.fulfill({
		status,
		contentType: 'application/json',
		headers: { ...CORS, ...headers },
		body: JSON.stringify(body)
	})
}

// Our /api/jev and the Anthropic API, answered by the test (no real key enters a test).
async function interceptProviders(page: Page) {
	await page.route(/\/api\/jev$/, async (route) => {
		const request = route.request()
		if (request.method() === 'GET') return json(route, 200, { data: [] })
		const { questions } = request.postDataJSON() as { questions: Record<string, { type: string }> }
		const answers = Object.fromEntries(
			Object.keys(questions).map((name) => [name, { type: 'noul', noul: 0.82 }])
		)
		return json(
			route,
			200,
			{ model: 'jev-1.13.0', answers, usage: { input_tokens: 200, output_tokens: 20 } },
			{ 'Server-Timing': 'upstream;dur=40' }
		)
	})
	await page.route('https://api.anthropic.com/**', async (route) => {
		const request = route.request()
		if (request.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: CORS })
		if (request.url().endsWith('/v1/models')) {
			return json(route, 200, {
				data: [{ id: 'claude-opus-5-5', display_name: 'Claude Opus 5.5' }]
			})
		}
		return json(route, 200, {
			model: 'claude-opus-5-5',
			content: [{ type: 'text', text: '{"answer":true}' }],
			usage: { input_tokens: 150, output_tokens: 12 }
		})
	})
}

async function readLink(page: Page): Promise<string> {
	const dialog = page.getByRole('dialog', { name: 'Link created' })
	await expect(dialog).toBeVisible()
	const link = await dialog.getByLabel('Share link').inputValue()
	expect(link).toMatch(/\/s\/[A-Za-z0-9_-]{22}$/)
	return link
}

test('flow 5: replay a preset, share it, open it signed out, delete it, the link is gone', async ({
	page,
	browser
}) => {
	await signIn(page, EMAIL)
	await page.getByRole('link', { name: 'Arena', exact: true }).first().click()
	await expect(page.getByRole('heading', { name: 'Arena', exact: true })).toBeVisible()
	// All 8 presets are there, Beginner mode needs no keys, and there is no Custom task tab.
	await expect(page.getByRole('group', { name: 'Presets' }).getByRole('button')).toHaveCount(8)
	await expect(page.getByRole('button', { name: /Custom task/ })).toHaveCount(0)

	await page.getByRole('button', { name: /Product match/ }).click()
	await expect(page).toHaveURL(/preset=product-match/)
	await page.getByRole('button', { name: 'Run both' }).click()
	// Each side appears after its recorded latency, labelled with its mode, model and date (R84).
	await expect(page.getByText(/^Beginner mode - recorded 2026-.* - jev-1\./)).toBeVisible({
		timeout: 15_000
	})
	await expect(page.getByText(/^Beginner mode - recorded 2026-.* - claude-opus-5-5$/)).toBeVisible({
		timeout: 15_000
	})
	await expect(page.getByText('Expected answer:')).toBeVisible()
	await expect(page.getByText(/^\+10 XP$/).first()).toBeVisible()
	await page.screenshot({ path: `${SCREENSHOT_DIR}/arena-beginner.png`, fullPage: true })

	// A preset shared in Beginner mode needs no consent: the link appears at once.
	await page.getByRole('button', { name: 'Share this result' }).click()
	const link = await readLink(page)
	await page.screenshot({ path: `${SCREENSHOT_DIR}/arena-link.png` })
	await page.keyboard.press('Escape')

	// Signed out, the shared page is read-only, labelled, and not indexed (R87).
	const visitor = await browser.newContext()
	const shared = await visitor.newPage()
	const response = await shared.goto(link)
	expect(response?.headers()['x-robots-tag']).toContain('noindex')
	await expect(shared.getByRole('heading', { name: 'Product match' })).toBeVisible()
	await expect(shared.getByText(/Beginner mode: replayed from real recordings/)).toBeVisible()
	await expect(shared.getByRole('link', { name: 'Sign in to try it yourself' })).toBeVisible()
	await expect(shared.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/)
	await shared.screenshot({ path: `${SCREENSHOT_DIR}/arena-shared.png`, fullPage: true })

	// It shows in "Your shared results", and Delete asks first.
	await page.reload()
	const mine = page.getByRole('region', { name: 'Your shared results' })
	await expect(mine.getByRole('link', { name: 'Product match' })).toBeVisible()
	await mine.getByRole('button', { name: /Delete the shared result Product match/ }).click()
	await page.getByRole('button', { name: 'Cancel' }).click()
	await expect(mine.getByRole('link', { name: 'Product match' })).toBeVisible()
	await mine.getByRole('button', { name: /Delete the shared result Product match/ }).click()
	await page.getByRole('button', { name: 'Delete share' }).click()
	await expect(mine.getByRole('link', { name: 'Product match' })).toHaveCount(0)

	// The link stopped working at once (R87).
	await shared.reload()
	await expect(shared.getByRole('heading', { name: 'Product match' })).toHaveCount(0)
	await expect(shared.getByText('Page not found')).toBeVisible()
	await visitor.close()
})

test('a replay awards XP once: a second run of the same preset earns nothing', async ({ page }) => {
	await signIn(page, EMAIL)
	await page.goto('/arena?preset=product-match')
	await page.getByRole('button', { name: 'Run both' }).click()
	await expect(page.getByText('Expected answer:')).toBeVisible({ timeout: 15_000 })
	await expect(page.getByText(/^\+10 XP$/)).toHaveCount(0)
})

test('Developer mode: edit a preset input, or write a custom task, and run live', async ({
	page,
	browser
}) => {
	await interceptProviders(page)
	await signIn(page, EMAIL)
	await page.goto('/arena?preset=citation-check')
	await page.getByRole('radio', { name: 'Developer' }).click()
	await expect(page.getByRole('dialog', { name: 'Your API keys' })).toBeVisible()
	await page.getByLabel('TypeSafe (Jev) key').fill(TS_KEY)
	await page.getByLabel('TypeSafe (Jev) key').press('Enter')
	await expect(page.getByText('Key works.')).toBeVisible()
	await page.getByLabel('Anthropic key').fill(ANTHROPIC_KEY)
	await page.getByLabel('Anthropic key').press('Enter')
	await expect(page.getByText(/1 models available/)).toBeVisible()
	await page.keyboard.press('Escape')
	await expect(page.getByLabel('Model')).toHaveValue('claude-opus-5-5')

	// An unchanged preset runs and shares without a consent step.
	await page.getByRole('button', { name: 'Run live' }).click()
	await expect(page.getByText(/^Developer mode - run \d{2}:\d{2} - jev-1\.13\.0$/)).toBeVisible({
		timeout: 20_000
	})
	await expect(page.getByText(/^Developer mode - run \d{2}:\d{2} - claude-opus-5-5$/)).toBeVisible()
	await page.getByRole('button', { name: 'Share this result' }).click()
	await expect(page.getByRole('dialog', { name: 'Link created' })).toBeVisible()
	await page.keyboard.press('Escape')

	// A custom task has no stored answer, and sharing it asks for consent first.
	await page.getByRole('button', { name: /Custom task/ }).click()
	await page.getByLabel('Text to look at').fill(SCRIPT_TEXT)
	await page.getByLabel('Question').fill('Is this a complaint?')
	await page.getByRole('button', { name: 'Run live' }).click()
	await expect(page.getByText('not scored').first()).toBeVisible({ timeout: 20_000 })
	await page.screenshot({ path: `${SCREENSHOT_DIR}/arena-custom.png`, fullPage: true })
	await page.getByRole('button', { name: 'Share this result' }).click()
	const consent = page.getByRole('dialog', { name: 'Make this result public?' })
	await expect(consent).toBeVisible()
	await expect(consent.getByRole('button', { name: 'Create link' })).toBeDisabled()
	// Esc cancels, and nothing was created.
	await page.keyboard.press('Escape')
	await expect(consent).toHaveCount(0)
	await page.getByRole('button', { name: 'Share this result' }).click()
	await consent.getByLabel(/I understand/).check()
	await consent.getByLabel(/I understand/).press('Enter')
	const link = await readLink(page)

	// Signed out: labelled as run by a user, and the user's text is plain text, never HTML (R86).
	const visitor = await browser.newContext()
	const shared = await visitor.newPage()
	await shared.goto(link)
	await expect(shared.getByText(/Developer mode, run by a user/)).toBeVisible()
	await expect(shared.getByText(SCRIPT_TEXT)).toBeVisible()
	expect(await shared.evaluate(() => '__xss' in window)).toBe(false)
	expect(await shared.locator('img').count()).toBe(0)
	await visitor.close()
})

test('the Arena and a shared result fit a phone in both themes', async ({ page }) => {
	await page.setViewportSize(VIEWPORTS.phone)
	await signIn(page, EMAIL)
	for (const scheme of COLOR_SCHEMES) {
		await page.emulateMedia({ colorScheme: scheme })
		await page.goto('/arena?preset=ticket-triage')
		await expect(page.getByRole('button', { name: 'Run both' })).toBeVisible()
		await expectNoHorizontalScroll(page)
		await page.getByRole('button', { name: 'Run both' }).click()
		await expect(page.getByText('Expected answer:')).toBeVisible({ timeout: 15_000 })
		await expectNoHorizontalScroll(page)
		await page.screenshot({ path: `${SCREENSHOT_DIR}/arena-phone-${scheme}.png`, fullPage: true })
	}
})
