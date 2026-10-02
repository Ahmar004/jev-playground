import { expect, test, type Page } from '@playwright/test'
import endQuiz from '../content/quizzes/end.json'
import startQuiz from '../content/quizzes/start.json'
import {
	COLOR_SCHEMES,
	expectNoHorizontalScroll,
	freshEmail,
	SCREENSHOT_DIR,
	signUp,
	VIEWPORTS
} from './helpers'

// Flow 7 (DESIGN 14): start quiz > end quiz > improvement shown > solutions, then Profile.
const EMAIL = freshEmail()
const LABELS: Record<string, string> = { jev: 'Jev', llm: 'An LLM', code: 'Plain Code' }
const XP_PER_RIGHT = 10
// A heading that only exists once the per-user part of each page has streamed in.
const LOADED_HEADINGS: Record<string, string> = {
	'/quizzes': 'Start quiz',
	'/quizzes/start': `You scored ${startQuiz.questions.filter((question) => question.answer === 'jev').length} of ${startQuiz.questions.length}`,
	'/profile': 'Badges'
}

test.describe.configure({ mode: 'serial' })

// One signed-in page for the whole file: Supabase rate-limits rapid sign-ins.
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
	await page.emulateMedia({ colorScheme: 'light' })
})

// Answers every question: `pickFor` names the tool to pick; the last step submits.
async function takeQuiz(quizPath: string, pickFor: (answer: string) => string, answers: string[]) {
	await page.goto(quizPath)
	for (const [index, answer] of answers.entries()) {
		await expect(page.getByText(`Question ${index + 1} of ${answers.length}`)).toBeVisible()
		await page.getByRole('radio', { name: LABELS[pickFor(answer)] ?? '', exact: true }).check()
		await page
			.getByRole('button', { name: index === answers.length - 1 ? 'Submit quiz' : 'Next' })
			.click()
	}
}

test('start quiz: one question per screen, scored on the server, with explanations', async () => {
	const answers = startQuiz.questions.map((question) => question.answer)
	await page.goto('/')
	await page.getByRole('link', { name: 'Take the start quiz (optional)' }).click()
	await expect(page).toHaveURL('/quizzes/start')
	// The answers are not in the page before the quiz is submitted.
	await expect(page.getByText(startQuiz.questions[0]!.explanation)).toHaveCount(0)
	// Enter submits the step.
	await page.getByRole('radio', { name: 'Jev', exact: true }).check()
	await page.keyboard.press('Enter')
	await expect(page.getByText(`Question 2 of ${answers.length}`)).toBeVisible()
	await page.getByRole('button', { name: 'Back' }).click()
	await expect(page.getByText(`Question 1 of ${answers.length}`)).toBeVisible()

	// Always pick Jev: right exactly where the answer is Jev.
	const jevRight = answers.filter((answer) => answer === 'jev').length
	await takeQuiz('/quizzes/start', () => 'jev', answers)
	await expect(
		page.getByRole('heading', { name: `You scored ${jevRight} of ${answers.length}` })
	).toBeVisible()
	await expect(page.getByText(`+${jevRight * XP_PER_RIGHT} XP`, { exact: true })).toBeVisible()
	await expect(page.getByText(startQuiz.questions[0]!.explanation)).toBeVisible()
	await expect(page.getByText('Take both quizzes to see how much you improved')).toBeVisible()

	// A reload shows the stored results, not the quiz again.
	await page.reload()
	await expect(
		page.getByRole('heading', { name: `You scored ${jevRight} of ${answers.length}` })
	).toBeVisible()
})

test('end quiz: improvement shows, Profile holds the badge and the XP', async () => {
	const startAnswers = startQuiz.questions.map((question) => question.answer)
	const jevRight = startAnswers.filter((answer) => answer === 'jev').length
	const answers = endQuiz.questions.map((question) => question.answer)
	await takeQuiz('/quizzes/end', (answer) => answer, answers)
	await expect(
		page.getByRole('heading', { name: `You scored ${answers.length} of ${answers.length}` })
	).toBeVisible()
	const gain = answers.length - jevRight
	await expect(page.getByText(`you improved by ${gain} points.`)).toBeVisible()

	await page.goto('/quizzes')
	await expect(page.getByText(`Scored ${answers.length} of ${answers.length}`)).toBeVisible()
	await expect(page.getByText(`you improved by ${gain} points.`)).toBeVisible()

	await page.getByRole('link', { name: 'Profile' }).first().click()
	await expect(page).toHaveURL('/profile')
	const xp = (jevRight + answers.length) * XP_PER_RIGHT
	await expect(page.getByText(`${xp} XP`, { exact: true })).toBeVisible()
	const climber = page.getByRole('listitem').filter({ hasText: 'Quiz Climber' })
	await expect(climber.getByText(/^Earned /)).toBeVisible()
	await expect(page.getByText('Finish all 8 levels to unlock it.')).toBeVisible()
	await expect(page.getByText('You have not shared anything yet.')).toBeVisible()
})

test('screenshots in both themes at desktop and phone width', async () => {
	for (const scheme of COLOR_SCHEMES) {
		for (const [name, size] of Object.entries(VIEWPORTS)) {
			await page.setViewportSize(size)
			await page.emulateMedia({ colorScheme: scheme })
			for (const route of ['/quizzes', '/quizzes/start', '/profile']) {
				await page.goto(route)
				await expect(
					page.getByRole('heading', { name: LOADED_HEADINGS[route] ?? '' })
				).toBeVisible()
				await expectNoHorizontalScroll(page)
				await page.screenshot({
					path: `${SCREENSHOT_DIR}/quizzes-${route.replaceAll('/', '_')}-${scheme}-${name}.png`
				})
			}
		}
	}
})
