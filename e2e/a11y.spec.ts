import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'
import {
	COLOR_SCHEMES,
	freshEmail,
	setColorScheme,
	signUp,
	VIEWPORTS,
	WELCOME_TOUR_TITLE
} from './helpers'

// Accessibility audit (R88-R91, ROADMAP Step-26): axe over every page, in both
// themes, at desktop and phone width, against WCAG 2.1 A and AA (spec 12.3).
const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']
const SETTLE_MS = 1500 // the pages rise in, and contrast is only right once they have

const LEVELS = [
	'speed-race',
	'write-me-a-poem',
	'count-and-dates',
	'how-sure',
	'spot-the-phish',
	'the-router',
	'break-it-down',
	'trick-jev'
]
const GAMES = [
	'twin-finder',
	'number-crunch',
	'needle-hunt',
	'citation-cop',
	'confidence-catch',
	'guardrail-gauntlet',
	'review-tug-of-war',
	'smart-home-dash'
]
const LEVEL_1_STEPS = ['predict', 'play', 'reveal', 'check']

const SIGNED_IN_PAGES = [
	'/',
	'/path',
	...LEVELS.map((id) => `/levels/${id}`),
	...LEVEL_1_STEPS.map((step) => `/levels/speed-race?step=${step}`),
	'/games',
	...GAMES.map((id) => `/games/${id}`),
	'/leaderboard',
	'/arena',
	'/arena?preset=ticket-triage',
	'/arena/batch/ticket-triage',
	'/sandbox',
	'/quizzes',
	'/quizzes/start',
	'/quizzes/end',
	'/profile',
	'/glossary',
	'/methodology',
	'/privacy'
]

type Finding = { page: string; rule: string; impact: string; targets: string[] }

async function scan(page: Page, label: string, findings: Finding[]) {
	await page.waitForTimeout(SETTLE_MS)
	const { violations } = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze()
	for (const violation of violations) {
		findings.push({
			page: label,
			rule: violation.id,
			impact: violation.impact ?? 'unknown',
			targets: violation.nodes.slice(0, 3).map((node) => node.target.join(' '))
		})
	}
}

function summary(findings: Finding[]): string {
	return findings
		.map((f) => `${f.impact} ${f.rule} on ${f.page}: ${f.targets.join(' | ')}`)
		.join('\n')
}

for (const scheme of COLOR_SCHEMES) {
	for (const [name, viewport] of Object.entries(VIEWPORTS)) {
		test(`axe finds no WCAG 2.1 AA violations: ${scheme} ${name}`, async ({ page }) => {
			test.setTimeout(360_000)
			const findings: Finding[] = []
			await page.setViewportSize(viewport)
			await setColorScheme(page, scheme)

			// Signed out: the one page before sign-in, both tabs.
			await page.goto('/sign-in')
			await scan(page, '/sign-in (sign in)', findings)
			await page.getByRole('tab', { name: 'Create account' }).click()
			await scan(page, '/sign-in (create account)', findings)

			await signUp(page, freshEmail())
			for (const path of SIGNED_IN_PAGES) {
				await page.goto(path)
				await scan(page, path, findings)
			}

			// The Keys panel is a dialog over a page: scan it open.
			await page.goto('/')
			await page.getByRole('button', { name: 'API keys' }).click()
			await expect(page.getByRole('dialog', { name: 'Your API keys' })).toBeVisible()
			await scan(page, '/ (Keys panel open)', findings)

			// The welcome tour is a dialog over Home too (ROADMAP Step-35).
			await page.goto('/')
			await page.getByRole('button', { name: 'Take a guide tour' }).click()
			await expect(page.getByRole('dialog', { name: WELCOME_TOUR_TITLE })).toBeVisible()
			await scan(page, '/ (welcome tour open)', findings)

			expect(findings, summary(findings)).toEqual([])
		})
	}
}
