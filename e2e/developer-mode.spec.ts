import { expect, test, type Page, type Route } from '@playwright/test'
import {
	expectNoHorizontalScroll,
	freshEmail,
	SCREENSHOT_DIR,
	signIn,
	signUp,
	VIEWPORTS
} from './helpers'

// Developer mode against intercepted providers: no real key ever enters a test
// (DESIGN 14). Flow 4 is the live run, flow 8 is the failure path.
const EMAIL = freshEmail()
const TS_KEY = 'ts-e2e-fake-key-0001'
const ANTHROPIC_KEY = 'sk-ant-e2e-fake-key-0002'
const CORS = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*' }

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

type Hits = { jev: number; messages: number; keysInUrl: number }

// Our /api/jev and the Anthropic API, answered by the test.
async function interceptProviders(page: Page, options: { messagesStatus?: number } = {}) {
	const hits: Hits = { jev: 0, messages: 0, keysInUrl: 0 }
	await page.route(/\/api\/jev$/, async (route) => {
		const request = route.request()
		if (request.method() === 'GET') return json(route, 200, { data: [] })
		hits.jev += 1
		const { questions } = request.postDataJSON() as {
			questions: Record<string, { criteria: Record<string, string> }>
		}
		const answers = Object.fromEntries(
			Object.entries(questions).map(([name, question]) => {
				const choice = Object.keys(question.criteria)[0] ?? 'billing'
				return [name, { type: 'choice', choice, probabilities: { [choice]: 0.9 }, confidence: 0.9 }]
			})
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
		if (request.url().includes(ANTHROPIC_KEY)) hits.keysInUrl += 1
		if (request.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: CORS })
		if (request.url().endsWith('/v1/models')) {
			return json(route, 200, {
				data: [{ id: 'claude-opus-5-5', display_name: 'Claude Opus 5.5' }]
			})
		}
		hits.messages += 1
		if (options.messagesStatus) return json(route, options.messagesStatus, { error: 'nope' })
		return json(route, 200, {
			model: 'claude-opus-5-5',
			content: [{ type: 'text', text: '{"answer":"billing"}' }],
			usage: { input_tokens: 150, output_tokens: 12 }
		})
	})
	return hits
}

async function openPlayInDeveloperMode(page: Page) {
	await signIn(page, EMAIL)
	await page.goto('/levels/speed-race?step=play')
	await expect(page.getByRole('heading', { name: 'Race', exact: true })).toBeVisible()
	await page.getByRole('radio', { name: 'Developer' }).click()
	// Switching with no keys opens the Keys panel (spec 3.1).
	await expect(page.getByRole('dialog', { name: 'Your API keys' })).toBeVisible()
}

async function saveKey(page: Page, label: string, key: string) {
	await page.getByLabel(`${label} key`).fill(key)
	await page.getByLabel(`${label} key`).press('Enter')
}

test('flow 4: keys panel, live race, labels, then Remove all', async ({ page }) => {
	const hits = await interceptProviders(page)
	await openPlayInDeveloperMode(page)
	await expect(page.getByText(/Developer mode\. Races on the Play step call/)).toBeVisible()

	await saveKey(page, 'TypeSafe (Jev)', TS_KEY)
	await expect(page.getByText('Key works.')).toBeVisible()
	await saveKey(page, 'Anthropic', ANTHROPIC_KEY)
	await expect(page.getByText(/1 models available/)).toBeVisible()
	await page.screenshot({ path: `${SCREENSHOT_DIR}/dev-keys-panel.png` })
	await page.keyboard.press('Escape')

	// Jev races the model the key can reach, live.
	await expect(page.getByLabel('Model')).toHaveValue('claude-opus-5-5')
	await expect(page.getByText(/Jev makes 40 calls and the LLM makes 40/)).toBeVisible()
	await page.getByRole('button', { name: 'Start the race' }).click()
	await expect(page.getByText('Finished. These numbers come from live calls.')).toBeVisible({
		timeout: 30_000
	})
	expect(hits.jev).toBe(40)
	expect(hits.messages).toBe(40)
	expect(hits.keysInUrl).toBe(0)

	// Every result says Developer mode, with the model that answered (R13).
	await expect(
		page.getByText(/^Developer mode - run \d{2}:\d{2} - jev-1\.13\.0$/).first()
	).toBeVisible()
	await expect(
		page.getByText(/^Developer mode - run \d{2}:\d{2} - claude-opus-5-5$/).first()
	).toBeVisible()
	await expect(page.getByText('Final numbers from this live run')).toBeVisible()
	await expect(page.getByText(/Beginner mode - recorded/)).toHaveCount(0)
	await page.screenshot({ path: `${SCREENSHOT_DIR}/dev-live-race.png`, fullPage: true })

	// Rule-8: no key in any browser storage.
	const stored = await page.evaluate(async () => {
		const databases = (await indexedDB.databases?.()) ?? []
		return JSON.stringify({
			local: { ...localStorage },
			session: { ...sessionStorage },
			cookie: document.cookie,
			databases
		})
	})
	expect(stored).not.toContain(TS_KEY)
	expect(stored).not.toContain(ANTHROPIC_KEY)

	// One click removes every key (R20), and the race asks for keys again.
	await page.getByRole('button', { name: 'API keys' }).click()
	await page.getByRole('button', { name: 'Remove all keys' }).click()
	await expect(page.getByLabel('TypeSafe (Jev) key')).toBeVisible()
	await page.keyboard.press('Escape')
	await expect(page.getByText('Add your TypeSafe key, so Jev can answer.')).toBeVisible()
})

test('keys vanish on reload and the page starts in Beginner mode (Rule-8)', async ({ page }) => {
	await interceptProviders(page)
	await openPlayInDeveloperMode(page)
	await saveKey(page, 'TypeSafe (Jev)', TS_KEY)
	await expect(page.getByText('Key works.')).toBeVisible()
	await page.keyboard.press('Escape')
	await page.reload()
	await expect(page.getByRole('radio', { name: 'Beginner' })).toBeChecked()
	await page.getByRole('radio', { name: 'Developer' }).click()
	await expect(page.getByLabel('TypeSafe (Jev) key')).toBeVisible()
})

test('flow 8: a rejected key stops the run with a friendly message and a Beginner fallback', async ({
	page
}) => {
	const hits = await interceptProviders(page, { messagesStatus: 401 })
	await openPlayInDeveloperMode(page)
	await saveKey(page, 'TypeSafe (Jev)', TS_KEY)
	await expect(page.getByText('Key works.')).toBeVisible()
	await saveKey(page, 'Anthropic', ANTHROPIC_KEY)
	await expect(page.getByText(/1 models available/)).toBeVisible()
	await page.keyboard.press('Escape')

	await page.getByRole('button', { name: 'Start the race' }).click()
	const alert = page.getByRole('alert').filter({ hasText: 'The run stopped' })
	await expect(alert).toContainText('Anthropic did not accept this key', { timeout: 30_000 })
	await expect(alert).not.toContainText(ANTHROPIC_KEY)
	// The run stopped early instead of spending all 40 calls on a bad key.
	expect(hits.messages).toBeLessThan(40)
	await expect(alert.getByRole('button', { name: 'Retry' })).toBeVisible()
	await page.screenshot({ path: `${SCREENSHOT_DIR}/dev-failure.png`, fullPage: true })

	await alert.getByRole('button', { name: 'Use Beginner mode instead' }).click()
	await expect(page.getByRole('radio', { name: 'Beginner' })).toBeChecked()
	await expect(page.getByText(/Beginner mode - recorded 2026-/).first()).toBeVisible()
})

test('Developer mode fits a phone', async ({ page }) => {
	await page.setViewportSize(VIEWPORTS.phone)
	await interceptProviders(page)
	await openPlayInDeveloperMode(page)
	await expectNoHorizontalScroll(page)
	await saveKey(page, 'TypeSafe (Jev)', TS_KEY)
	await expect(page.getByText('Key works.')).toBeVisible()
	await expectNoHorizontalScroll(page)
	await page.screenshot({ path: `${SCREENSHOT_DIR}/dev-keys-phone.png` })
})
