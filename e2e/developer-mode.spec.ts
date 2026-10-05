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
async function interceptProviders(
	page: Page,
	options: {
		messagesStatus?: number
		jevStatus?: number
		// Overrides Jev's answer for a message; undefined keeps the default.
		jevAnswer?: (state: string) => unknown
	} = {}
) {
	const hits: Hits = { jev: 0, messages: 0, keysInUrl: 0 }
	await page.route(/\/api\/jev$/, async (route) => {
		const request = route.request()
		if (request.method() === 'GET') return json(route, 200, { data: [] })
		hits.jev += 1
		if (options.jevStatus) return json(route, options.jevStatus, { detail: 'nope' })
		const { state, questions } = request.postDataJSON() as {
			state: unknown
			questions: Record<string, { type: string; criteria?: Record<string, string> }>
		}
		// A text question is rejected, as the real Jev does (level 6's writing cards).
		if (Object.values(questions).some((question) => question.type === 'text')) {
			return json(route, 400, {
				detail: { error_type: 'api_usage_error', message: 'Invalid request.' }
			})
		}
		const answers = Object.fromEntries(
			Object.entries(questions).map(([name, question]) => {
				const override = typeof state === 'string' ? options.jevAnswer?.(state) : undefined
				if (override !== undefined) return [name, override]
				if (question.type === 'noul') return [name, { type: 'noul', noul: 0.9 }]
				const choice = Object.keys(question.criteria ?? {})[0] ?? 'billing'
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
		if (new URL(request.url()).pathname === '/v1/models') {
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

async function openPlayInDeveloperMode(page: Page, levelId = 'speed-race', heading = 'Race') {
	await signIn(page, EMAIL)
	await page.goto(`/levels/${levelId}?step=play`)
	await expect(page.getByRole('heading', { name: heading, exact: true })).toBeVisible()
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
	// The first finished live run pays once: 50 XP and the Live Wire badge (DESIGN 10).
	await expect(page.getByText('Badge earned: Live Wire', { exact: true })).toBeVisible()
	await expect(page.getByText('+50 XP', { exact: true })).toBeVisible()

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

	// Reveal shows the live run's numbers beside the recorded ones, each labelled (Step-13).
	await page.getByRole('button', { name: 'See the result' }).click()
	const scoreboard = page.getByRole('table', {
		name: 'Your live run and every recorded model on the same 40 items'
	})
	await expect(
		scoreboard.getByText(/^Developer mode - run \d{2}:\d{2} - jev-1\.13\.0$/)
	).toBeVisible()
	await expect(
		scoreboard.getByText(/^Developer mode - run \d{2}:\d{2} - claude-opus-5-5$/)
	).toBeVisible()
	await expect(scoreboard.getByText(/^Beginner mode - recorded /).first()).toBeVisible()
	await expect(page.getByText(/Your prediction is scored against the recordings/)).toBeVisible()
	await page.screenshot({ path: `${SCREENSHOT_DIR}/dev-reveal-live.png`, fullPage: true })
	// Nothing new was called or saved for Reveal.
	expect(hits.jev).toBe(40)
	expect(hits.messages).toBe(40)
	await page.getByRole('button', { name: 'Race again' }).click()

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
	// A stopped run is not a finish: nothing is saved and no badge is paid.
	await expect(page.getByText('Saved to your Leaderboard')).toHaveCount(0)
	await expect(page.getByText('Badge earned: Live Wire')).toHaveCount(0)
	await page.screenshot({ path: `${SCREENSHOT_DIR}/dev-failure.png`, fullPage: true })

	await alert.getByRole('button', { name: 'Use Beginner mode instead' }).click()
	await expect(page.getByRole('radio', { name: 'Beginner' })).toBeChecked()
	await expect(page.getByText(/Beginner mode - recorded 2026-/).first()).toBeVisible()
})

// The tool each Router card suits best, as the level's content says.
const ROUTER_PICKS = [
	['Sort a support message', 'Jev'],
	['Add two numbers', 'Code'],
	['Write a poem', 'LLM'],
	['Spot a scam message', 'Jev'],
	['Which date is first', 'Code'],
	['Summarize a paragraph', 'LLM']
] as const

test('level 6 runs every router card live, labelled with the mode, model and run time (R14)', async ({
	page
}) => {
	const hits = await interceptProviders(page)
	await openPlayInDeveloperMode(page, 'the-router', 'Play')
	await saveKey(page, 'TypeSafe (Jev)', TS_KEY)
	await expect(page.getByText('Key works.')).toBeVisible()
	await saveKey(page, 'Anthropic', ANTHROPIC_KEY)
	await expect(page.getByText(/1 models available/)).toBeVisible()
	await page.keyboard.press('Escape')
	await expect(page.getByText(/still uses recorded results/)).toHaveCount(0)

	for (const [title, tool] of ROUTER_PICKS) {
		await page.getByRole('button', { name: `Send ${title} to ${tool}` }).click()
	}
	await expect(
		page.getByText(/^Every card runs live: Jev and the LLM make one call each/)
	).toBeVisible()
	await page.getByRole('button', { name: 'Run the pipeline' }).click()

	const results = page.getByRole('list', { name: 'Results for each card' })
	await expect(results.getByText(/^Right tool:/)).toHaveCount(6)
	await expect(results.getByText('Waiting for the live call...')).toHaveCount(0, {
		timeout: 30_000
	})
	// One call per card per tool, no hidden retries (R7), and no key in a URL (Rule-8).
	expect(hits.jev).toBe(6)
	expect(hits.messages).toBe(6)
	expect(hits.keysInUrl).toBe(0)
	await expect(results.getByText(/^Developer mode - run \d{2}:\d{2} - jev-1\.13\.0$/)).toHaveCount(
		6
	)
	await expect(
		results.getByText(/^Developer mode - run \d{2}:\d{2} - claude-opus-5-5$/)
	).toHaveCount(6)
	await expect(results.getByText(/Beginner mode - recorded/)).toHaveCount(0)
	// Jev's real rejection of a writing card is shown as a miss (R44); Code still has no rule for it.
	await expect(results.getByText(/Invalid request\./).first()).toBeVisible()
	await expect(results.getByText('Code has no rule for this job.').first()).toBeVisible()
	await expect(page.getByText('Badge earned: Right Tool', { exact: true })).toBeVisible()
	await page.screenshot({ path: `${SCREENSHOT_DIR}/dev-router-live.png`, fullPage: true })

	// Reveal shows the live run above the recorded one, each card labelled (Step-13).
	await page.getByRole('button', { name: 'See the result' }).click()
	const live = page.getByRole('list', { name: 'Your live run, for each card' })
	const recorded = page.getByRole('list', { name: 'Recorded runs, for each card' })
	await expect(live.getByText(/^Developer mode - run \d{2}:\d{2} - claude-opus-5-5$/)).toHaveCount(
		6
	)
	await expect(live.getByText(/Beginner mode/)).toHaveCount(0)
	await expect(recorded.getByText(/^Beginner mode - recorded /).first()).toBeVisible()
	await expect(recorded.getByText(/Developer mode/)).toHaveCount(0)
	expect(hits.jev).toBe(6)
	expect(hits.messages).toBe(6)
})

test('level 6 live: a rejected LLM key stops the run and offers Beginner mode', async ({
	page
}) => {
	const hits = await interceptProviders(page, { messagesStatus: 401 })
	await openPlayInDeveloperMode(page, 'the-router', 'Play')
	await saveKey(page, 'TypeSafe (Jev)', TS_KEY)
	await expect(page.getByText('Key works.')).toBeVisible()
	await saveKey(page, 'Anthropic', ANTHROPIC_KEY)
	await expect(page.getByText(/1 models available/)).toBeVisible()
	await page.keyboard.press('Escape')
	for (const [title, tool] of ROUTER_PICKS) {
		await page.getByRole('button', { name: `Send ${title} to ${tool}` }).click()
	}
	await page.getByRole('button', { name: 'Run the pipeline' }).click()
	const alert = page.getByRole('alert').filter({ hasText: 'The run stopped' })
	await expect(alert).toContainText('Anthropic did not accept this key', { timeout: 30_000 })
	expect(hits.messages).toBeLessThan(6)
	await expect(
		page
			.getByRole('list', { name: 'Results for each card' })
			.getByText('Not run: the live run stopped first.')
			.first()
	).toBeVisible()
	await alert.getByRole('button', { name: 'Use Beginner mode instead' }).click()
	await expect(page.getByRole('radio', { name: 'Beginner' })).toBeChecked()
})

async function openTricksWithJevKey(page: Page) {
	await openPlayInDeveloperMode(page, 'trick-jev', 'Play')
	await saveKey(page, 'TypeSafe (Jev)', TS_KEY)
	await expect(page.getByText('Key works.')).toBeVisible()
	await page.keyboard.press('Escape')
	await expect(page.getByRole('heading', { name: 'Write your own trick' })).toBeVisible()
}

async function askJev(page: Page, text: string, answer: 'Yes' | 'No') {
	await page.getByLabel('Your message').fill(text)
	await page.getByRole('radio', { name: answer, exact: true }).check()
	await page.getByLabel('Your message').press('Enter')
}

test("level 8: the user's own trick runs live against Jev, and a reply that does not parse is a miss (R14, R44)", async ({
	page
}) => {
	const hits = await interceptProviders(page, {
		jevAnswer: (state) =>
			state.startsWith('Garble') ? { type: 'choice', choice: 'x', confidence: 0.5 } : undefined
	})
	await openTricksWithJevKey(page)
	// Only the TypeSafe key is needed; the recorded pairs to guess on stay below.
	await expect(page.getByRole('heading', { name: 'Which tricks fool Jev?' })).toBeVisible()
	const tricks = page.getByRole('list', { name: 'Your tricks' })

	// The fake Jev says 90% yes; the user says the right answer is no.
	await askJev(page, 'I asked about cancelling, but please keep my plan.', 'No')
	const fooled = tricks.getByRole('listitem').first()
	await expect(fooled).toContainText('You fooled Jev')
	await expect(fooled).toContainText('Jev: 90% yes')
	await expect(fooled.getByText(/^Developer mode - run \d{2}:\d{2} - jev-1\.13\.0$/)).toBeVisible()

	await askJev(page, 'Garble this one', 'Yes')
	const unparsed = tricks.getByRole('listitem').first()
	await expect(unparsed).toContainText("Couldn't parse")
	await expect(unparsed).toContainText('counts as a miss')
	await expect(unparsed).toContainText('"choice":"x"')
	await expect(tricks.getByRole('listitem')).toHaveCount(2)
	// One call per attempt, no hidden retries (R7).
	expect(hits.jev).toBe(2)
	await page.screenshot({ path: `${SCREENSHOT_DIR}/dev-tricks-live.png`, fullPage: true })

	// Reveal lists the live tricks above the recorded pairs, and they stay for Play (Step-13).
	await page.getByRole('button', { name: 'See the result' }).click()
	const revealed = page.getByRole('list', { name: 'Your live tricks' })
	await expect(revealed.getByRole('listitem')).toHaveCount(2)
	await expect(revealed.getByText(/^Developer mode - run \d{2}:\d{2} - jev-1\.13\.0$/)).toHaveCount(
		2
	)
	await expect(
		page.getByRole('heading', { name: 'Your guesses against what happened' })
	).toBeVisible()
	await page.getByRole('button', { name: 'Race again' }).click()
	await expect(tricks.getByRole('listitem')).toHaveCount(2)
	expect(hits.jev).toBe(2)
})

test('level 8 live: a rejected TypeSafe key stops with a friendly message and Beginner mode', async ({
	page
}) => {
	await interceptProviders(page, { jevStatus: 401 })
	await openTricksWithJevKey(page)
	await askJev(page, 'Cancel it, maybe.', 'Yes')
	const alert = page.getByRole('alert').filter({ hasText: 'The run stopped' })
	await expect(alert).toBeVisible()
	await expect(page.getByRole('list', { name: 'Your tricks' })).toHaveCount(0)
	await alert.getByRole('button', { name: 'Use Beginner mode instead' }).click()
	await expect(page.getByRole('radio', { name: 'Beginner' })).toBeChecked()
	await expect(page.getByRole('heading', { name: 'Write your own trick' })).toHaveCount(0)
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
