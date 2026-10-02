// Signs up one fresh test user on the local app (the same way the e2e tests
// do) and writes its session cookies to load/.session, which the k6 journey
// reads. The file is gitignored: it holds a live session token.
import { writeFileSync } from 'node:fs'
import { chromium } from '@playwright/test'

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:3000'
const OUT_FILE = new URL('./.session', import.meta.url)
// A throwaway account for load tests only (confirmation is off in Supabase).
const PASSWORD = 'load-password-123'
const email = `load+${Date.now()}@example.com`

const browser = await chromium.launch()
try {
	const page = await browser.newPage()
	await page.goto(`${BASE_URL}/sign-in`)
	await page.getByRole('tab', { name: 'Create account' }).click()
	const panel = page.getByRole('tabpanel')
	await panel.getByLabel('Email').fill(email)
	await panel.getByLabel('Password').fill(PASSWORD)
	await panel.getByRole('button', { name: 'Create account' }).click()
	await page.waitForURL(`${BASE_URL}/`)
	const cookies = await page.context().cookies(BASE_URL)
	writeFileSync(OUT_FILE, cookies.map(({ name, value }) => `${name}=${value}`).join('; '))
	process.stdout.write(`Signed up ${email}; session saved to load/.session\n`)
} finally {
	await browser.close()
}
