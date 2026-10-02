import { expect, test } from '@playwright/test'
import { expectNoHorizontalScroll, freshEmail, signUp, VIEWPORTS } from './helpers'

// Arena batch mode (R45, spec 8): a preset with a big task runs all its items through the race view.
test('a preset runs as a batch and the race finishes with every item', async ({ page }) => {
	await signUp(page, freshEmail())
	await page.goto('/arena?preset=ticket-triage')
	await page.getByRole('link', { name: /Run all 40 items as a batch/ }).click()
	await expect(page).toHaveURL(/\/arena\/batch\/ticket-triage$/)
	await expect(page.getByRole('heading', { name: 'Ticket triage: batch' })).toBeVisible()
	await page.getByRole('button', { name: 'Start the race' }).click()
	await page.getByRole('button', { name: 'Skip to result' }).click()
	await expect(page.getByText(/of 40\)/).first()).toBeVisible()
	await page.setViewportSize(VIEWPORTS.phone)
	await expectNoHorizontalScroll(page)
})

test('a preset with a tiny task has no batch link', async ({ page }) => {
	await signUp(page, freshEmail())
	await page.goto('/arena?preset=date-comparison')
	await expect(page.getByRole('heading', { name: 'Date comparison' })).toBeVisible()
	await expect(page.getByRole('link', { name: /as a batch/ })).toHaveCount(0)
	expect((await page.goto('/arena/batch/date-comparison'))?.status()).toBe(404)
})
