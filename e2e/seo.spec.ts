import { expect, test } from '@playwright/test'

// A signed-out request is what a link-preview bot (Discord) and a crawler send.
test.describe('SEO and sharing, signed out', () => {
	test('sign-in carries the Open Graph card and the image is reachable without signing in', async ({
		page,
		request
	}) => {
		await page.goto('/sign-in')
		const imageUrl = await page.locator('meta[property="og:image"]').getAttribute('content')
		expect(imageUrl).toMatch(/\/opengraph-image/)
		await expect(page.locator('meta[property="og:title"]')).toHaveAttribute(
			'content',
			"Jev's Playground"
		)
		await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute(
			'content',
			'summary_large_image'
		)

		// maxRedirects 0: a redirect to /sign-in would mean the gate swallowed the image.
		const image = await request.get(imageUrl ?? '', { maxRedirects: 0 })
		expect(image.status()).toBe(200)
		expect(image.headers()['content-type']).toBe('image/png')
	})

	test('robots.txt allows crawling and names the sitemap', async ({ request }) => {
		const response = await request.get('/robots.txt', { maxRedirects: 0 })
		expect(response.status()).toBe(200)
		const body = await response.text()
		expect(body).toContain('Allow: /')
		expect(body).toMatch(/Sitemap: https?:\/\/.+\/sitemap\.xml/)
	})

	test('sitemap.xml lists sign-in and no shared result', async ({ request }) => {
		const response = await request.get('/sitemap.xml', { maxRedirects: 0 })
		expect(response.status()).toBe(200)
		const body = await response.text()
		expect(body).toContain('/sign-in</loc>')
		expect(body).not.toContain('/s/')
	})

	test('a shared result page stays noindex (R87)', async ({ request }) => {
		const response = await request.get('/s/not-a-real-share', { maxRedirects: 0 })
		expect(response.headers()['x-robots-tag']).toBe('noindex, nofollow')
	})
})
