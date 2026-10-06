import { expect, test } from '@playwright/test'
import { freshEmail, PASSWORD } from './helpers'

// Step-46: launch-traffic hardening that a visitor can see.

// A well-formed Server Action id (42 hex characters) that no build ever made.
const UNKNOWN_ACTION_ID = '0'.repeat(42)

test('a router prefetch skips the proxy, while a page load still goes through it', async ({
	request
}) => {
	// Signed out, a page load is sent to sign-in by the proxy.
	const load = await request.get('/leaderboard', { maxRedirects: 0 })
	expect(load.status()).toBe(307)
	expect(load.headers()['location']).toContain('/sign-in')

	// A prefetch is not: it costs no function call on Vercel for the proxy, and
	// the page itself still finds no session, so no one's data is in it.
	const prefetch = await request.get('/leaderboard', {
		maxRedirects: 0,
		headers: { purpose: 'prefetch' }
	})
	expect(prefetch.status()).toBe(200)
})

test('a tab opened before a deploy asks for a reload instead of failing quietly', async ({
	page
}) => {
	await page.goto('/sign-in')
	// What a deploy does to an open tab: the new server doesn't know the Server
	// Action id the old page sends.
	await page.route('**/sign-in', async (route) => {
		const headers = route.request().headers()
		if (route.request().method() !== 'POST' || !headers['next-action']) return route.continue()
		await route.continue({ headers: { ...headers, 'next-action': UNKNOWN_ACTION_ID } })
	})

	await page.getByLabel('Email').fill(freshEmail())
	await page.getByLabel('Password').fill(PASSWORD)
	await page.getByRole('button', { name: 'Sign in' }).click()

	await expect(page.getByText('The site was just updated')).toBeVisible()
	await expect(page.getByText('Reload to continue.')).toBeVisible()
	await expect(page.getByText(/Could not reach the server/)).toHaveCount(0)

	await page.unroute('**/sign-in')
	await Promise.all([
		page.waitForEvent('load'),
		page.getByRole('button', { name: 'Reload' }).click()
	])
	await expect(page.getByText('The site was just updated')).toHaveCount(0)
})
