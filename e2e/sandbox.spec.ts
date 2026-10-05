import { expect, test, type Page, type Route } from '@playwright/test'
import {
	COLOR_SCHEMES,
	expectNoHorizontalScroll,
	freshEmail,
	SCREENSHOT_DIR,
	signUp,
	VIEWPORTS
} from './helpers'

// Flow 6 (DESIGN 14): Sandbox template > edit in Form, see the JSON in sync > over-limit block > Copy as code.
const EMAIL = freshEmail()
const TS_KEY = 'ts-e2e-fake-key-0001'
const CORS = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*' }

test.describe.configure({ mode: 'serial' })

// One signed-in page for the whole file: Supabase rate-limits rapid sign-ins.
let page: Page
test.beforeAll(async ({ browser }) => {
	const context = await browser.newContext()
	await context.grantPermissions(['clipboard-read', 'clipboard-write'])
	page = await context.newPage()
	await signUp(page, EMAIL)
})
test.afterAll(async () => {
	await page.context().close()
})
test.beforeEach(async () => {
	await page.unrouteAll()
	await page.setViewportSize(VIEWPORTS.desktop)
	await page.emulateMedia({ colorScheme: 'light' })
	await page.goto('/')
})

type Question = { type: string; criteria?: Record<string, unknown> | unknown[] }

function answerFor(question: Question): unknown {
	if (question.type === 'choice') {
		const options = Object.keys(question.criteria ?? {})
		return {
			type: 'choice',
			choice: options[0],
			confidence: 0.9,
			probabilities: Object.fromEntries(options.map((option, i) => [option, i === 0 ? 0.9 : 0.1]))
		}
	}
	if (question.type === 'score') {
		const levels = (question.criteria ?? []) as unknown[]
		return {
			type: 'score',
			score: 1,
			confidence: 0.8,
			legend: Object.fromEntries(levels.map((level, i) => [String(i), String(level)])),
			probabilities: Object.fromEntries(levels.map((_, i) => [String(i), i === 1 ? 0.8 : 0.2]))
		}
	}
	return { type: 'noul', noul: 0.82 }
}

function json(route: Route, status: number, body: unknown, headers: Record<string, string> = {}) {
	return route.fulfill({
		status,
		contentType: 'application/json',
		headers: { ...CORS, ...headers },
		body: JSON.stringify(body)
	})
}

// Our /api/jev, answered by the test (no real key enters a test). `reject` makes every run a 422.
async function interceptJev(page: Page, options: { reject?: boolean } = {}) {
	await page.route(/\/api\/jev$/, async (route) => {
		const request = route.request()
		if (request.method() === 'GET') return json(route, 200, { data: [] })
		if (options.reject) return json(route, 422, { error: 'Invalid request.' })
		const { questions } = request.postDataJSON() as { questions: Record<string, Question> }
		const answers = Object.fromEntries(
			Object.entries(questions).map(([name, question]) => [name, answerFor(question)])
		)
		return json(
			route,
			200,
			{ model: 'jev-1.13.0', answers, usage: { input_tokens: 200, output_tokens: 20 } },
			{ 'Server-Timing': 'upstream;dur=40' }
		)
	})
}

async function addKey(page: Page) {
	await page.getByRole('radio', { name: 'Developer' }).click()
	await expect(page.getByRole('dialog', { name: 'Your API keys' })).toBeVisible()
	await page.getByLabel('TypeSafe (Jev) key').fill(TS_KEY)
	await page.getByLabel('TypeSafe (Jev) key').press('Enter')
	await expect(page.getByText('Key works.')).toBeVisible()
	await page.keyboard.press('Escape')
}

test('flow 6: a template replays, the Form and JSON stay in sync, the checks warn and block, and the code copies', async () => {
	await page.getByRole('link', { name: 'Sandbox', exact: true }).first().click()
	await expect(page.getByRole('heading', { name: 'Sandbox', exact: true })).toBeVisible()
	// Six templates and a blank start; Beginner mode needs no keys.
	await expect(page.getByRole('group', { name: 'Templates' }).getByRole('button')).toHaveCount(7)

	// A template replays its real Jev recording at the recorded latency, labelled (R84).
	await page.getByRole('button', { name: "Show Jev's answer" }).click()
	await expect(page.getByText(/^Beginner mode - recorded 2026-.* - jev-1\./)).toBeVisible({
		timeout: 15_000
	})
	await expect(page.getByText('Picked: billing')).toBeVisible()

	// Edit in the Form: the JSON view follows (R48).
	await page.getByLabel('Name').first().fill('team')
	await expect(page.getByLabel('Request JSON')).toHaveValue(/"team": \{/)
	await expect(page.getByText(/You changed this setup/)).toBeVisible()

	// Edit the JSON: the Form follows. An invalid edit explains itself and the Form keeps the last valid setup.
	const body = {
		state: 'Hello there',
		questions: { friendly: { type: 'noul', instructions: 'Is this friendly?' } }
	}
	await page.getByLabel('Request JSON').fill(JSON.stringify(body))
	await expect(page.getByLabel(/^State/)).toHaveValue('Hello there')
	await expect(page.getByLabel('Name')).toHaveValue('friendly')
	await page.getByLabel('Request JSON').fill('{"state": ')
	await expect(page.getByText(/not valid JSON yet/)).toBeVisible()
	await expect(page.getByLabel('Name')).toHaveValue('friendly')

	// Weakness warnings (R52) name the question; they never block.
	await page.getByLabel('Request JSON').fill(
		JSON.stringify({
			state: 'Apples and pears',
			questions: { fruit: { type: 'noul', instructions: 'How many apples are there?' } }
		})
	)
	await expect(page.getByText(/Counting is a known weak spot/)).toBeVisible()

	// Over Jev's limit: the check says so, in words, and labels itself an estimate (R53).
	await page.getByLabel(/^State/).fill('x'.repeat(140_000))
	await expect(page.getByText(/Jev accepts at most 32000/)).toBeVisible()
	await expect(page.getByText(/an estimate/).first()).toBeVisible()
	await page.getByLabel(/^State/).fill('Apples and pears')

	// Copy as code (R54): a ready-to-run request with a key placeholder.
	await page.getByRole('button', { name: 'Copy curl' }).click()
	await expect(page.getByText('curl copied').first()).toBeVisible()
	const copied = await page.evaluate(() => navigator.clipboard.readText())
	expect(copied).toContain('https://api.typesafe.ai/v1/systemone')
	expect(copied).toContain('Bearer YOUR_TYPESAFE_KEY')
	await page.getByRole('button', { name: 'TypeScript' }).click()
	await expect(page.getByText(/await fetch\('https:\/\/api\.typesafe\.ai/)).toBeVisible()

	// Start blank, then reset a template.
	await page.getByRole('button', { name: /Start blank/ }).click()
	await expect(page).toHaveURL(/template=blank/)
	await expect(page.getByLabel(/^State/)).toHaveValue('')
	await page.getByRole('button', { name: /Support ticket/ }).click()
	await expect(page).toHaveURL(/template=support-ticket/)
	await expect(page.getByLabel('Name').first()).toHaveValue('category')
	await page.getByLabel('Name').first().fill('team')
	await page.getByRole('button', { name: 'Reset the template' }).click()
	await expect(page.getByLabel('Name').first()).toHaveValue('category')
})

test('the Form sets Noul criteria and Choice option descriptions, in sync with the JSON view', async () => {
	await page.goto('/sandbox?template=blank')
	await page.getByLabel(/^State/).fill('The pasta was lovely but slow.')
	const json = page.getByLabel('Request JSON')

	// A Noul criterion lands in the JSON view, and clearing it removes the key again.
	await page.getByLabel('When is the answer true? (optional)').fill('They praise the food')
	await expect(json).toHaveValue(/"criteria": \{\s*"true": "They praise the food"/)
	await page.getByLabel('When is the answer true? (optional)').fill('')
	await expect(json).not.toHaveValue(/"criteria"/)

	// A Choice option description lands in the JSON view too.
	await page.getByLabel('Answer type').selectOption('choice')
	await page.getByLabel(/^Options, one per line/).fill('food\nspeed')
	await page.getByLabel('What does "speed" mean? (optional)').fill('How long it took')
	await expect(json).toHaveValue(/"speed": "How long it took"/)
	await expect(json).toHaveValue(/"food": null/)

	// An edit in the JSON view shows up in the Form fields.
	const body = {
		state: 'Hello',
		questions: {
			friendly: { type: 'noul', instructions: 'Friendly?', criteria: { false: 'Any insult' } },
			topic: { type: 'choice', instructions: 'Topic?', criteria: { a: 'First', b: null } }
		}
	}
	await json.fill(JSON.stringify(body))
	await expect(page.getByLabel('When is the answer false? (optional)')).toHaveValue('Any insult')
	await expect(page.getByLabel('What does "a" mean? (optional)')).toHaveValue('First')
	await expect(page.getByLabel('What does "b" mean? (optional)')).toHaveValue('')
})

test('Developer mode runs the setup on Jev with your TypeSafe key, and explains a rejection', async () => {
	await interceptJev(page)
	await page.goto('/sandbox?template=moderation')
	await expect(page.getByRole('heading', { name: 'Post moderation' })).toBeVisible()
	await page.getByRole('radio', { name: 'Developer' }).click()
	// Without a key there is nothing to run with, and the page says how to fix that.
	await expect(page.getByRole('dialog', { name: 'Your API keys' })).toBeVisible()
	await page.keyboard.press('Escape')
	await expect(page.getByRole('button', { name: 'Add your TypeSafe key' })).toBeVisible()
	await page.getByRole('button', { name: 'Add your TypeSafe key' }).click()
	await page.getByLabel('TypeSafe (Jev) key').fill(TS_KEY)
	await page.getByLabel('TypeSafe (Jev) key').press('Enter')
	await expect(page.getByText('Key works.')).toBeVisible()
	await page.keyboard.press('Escape')

	await page.getByRole('button', { name: 'Run on Jev' }).click()
	await expect(page.getByText(/^Developer mode - run \d{2}:\d{2} - jev-1\.13\.0$/)).toBeVisible({
		timeout: 20_000
	})
	await expect(page.getByText(/Picked:/)).toBeVisible()

	// A setup over the limit cannot be sent.
	await page.getByLabel(/^State/).fill('x'.repeat(140_000))
	await expect(page.getByRole('button', { name: 'Run on Jev' })).toBeDisabled()
})

test('a rejected request shows what Jev said, in plain words', async () => {
	await interceptJev(page, { reject: true })
	await page.goto('/sandbox?template=spam-check')
	await addKey(page)
	await page.getByRole('button', { name: 'Run on Jev' }).click()
	await expect(page.getByText(/Jev rejected this request/)).toBeVisible({ timeout: 20_000 })
	await expect(page.getByText('Invalid request.')).toBeVisible()
})

for (const scheme of COLOR_SCHEMES) {
	for (const [name, viewport] of Object.entries(VIEWPORTS)) {
		test(`screenshot and no horizontal scroll: ${scheme} ${name}`, async () => {
			await page.setViewportSize(viewport)
			await page.emulateMedia({ colorScheme: scheme })
			await page.goto('/sandbox?template=support-ticket')
			await expect(page.getByRole('heading', { name: 'Support ticket' })).toBeVisible()
			await page.getByRole('button', { name: "Show Jev's answer" }).click()
			await expect(page.getByText('Picked: billing')).toBeVisible({ timeout: 15_000 })
			await expectNoHorizontalScroll(page)
			await page.screenshot({
				path: `${SCREENSHOT_DIR}/sandbox-${scheme}-${name}.png`,
				fullPage: true
			})
		})
	}
}
