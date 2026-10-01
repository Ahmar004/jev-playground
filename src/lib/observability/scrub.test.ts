import type { Breadcrumb, ErrorEvent } from '@sentry/nextjs'
import { describe, expect, it } from 'vitest'
import { scrubBreadcrumb, scrubEvent } from './scrub'

const KEY = 'sk-ant-api03-secret'

function eventWith(request: ErrorEvent['request'], breadcrumbs?: Breadcrumb[]): ErrorEvent {
	return { type: undefined, request, breadcrumbs }
}

describe('scrubEvent', () => {
	it('drops every key-carrying header, whatever its case', () => {
		const event = scrubEvent(
			eventWith({
				url: 'http://localhost:3000/api/health',
				headers: {
					Authorization: `Bearer ${KEY}`,
					'X-Api-Key': KEY,
					'x-goog-api-key': KEY,
					accept: 'application/json'
				}
			})
		)

		expect(event.request?.headers).toEqual({ accept: 'application/json' })
	})

	it('drops the body of a provider call and of the /api/jev pass-through', () => {
		for (const url of [
			'https://api.anthropic.com/v1/messages',
			'https://openrouter.ai/api/v1/chat/completions',
			'https://api.openai.com/v1/responses',
			'https://generativelanguage.googleapis.com/v1beta/models/gemini:generateContent',
			'https://api.typesafe.ai/v1/systemone',
			'http://localhost:3000/api/jev'
		]) {
			const event = scrubEvent(eventWith({ url, data: { key: KEY, task: 'user text' } }))
			expect(event.request?.data, url).toBeUndefined()
		}
	})

	it('keeps the body of any other request', () => {
		const event = scrubEvent(
			eventWith({ url: 'http://localhost:3000/api/health', data: { ok: 1 } })
		)

		expect(event.request?.data).toEqual({ ok: 1 })
	})

	it('removes a key query parameter from the request URL and query string', () => {
		const event = scrubEvent(
			eventWith({
				url: `https://generativelanguage.googleapis.com/v1beta/models?key=${KEY}&pageSize=5`,
				query_string: `key=${KEY}&pageSize=5`
			})
		)

		expect(event.request?.url).not.toContain(KEY)
		expect(event.request?.url).toContain('pageSize=5')
		expect(JSON.stringify(event.request?.query_string)).not.toContain(KEY)
	})

	it('removes a key query parameter from URLs in the event contexts', () => {
		// @sentry/nextjs records the request path, query included, here.
		const event = scrubEvent({
			type: undefined,
			contexts: { nextjs: { request_path: `/api/jev?key=${KEY}&page=2`, route_type: 'route' } }
		})

		expect(event.contexts?.nextjs?.request_path).toBe('/api/jev?page=2')
		expect(event.contexts?.nextjs?.route_type).toBe('route')
	})

	it('scrubs the breadcrumbs the event carries', () => {
		const event = scrubEvent(
			eventWith({ url: 'http://localhost:3000/' }, [
				{ category: 'fetch', data: { url: `https://example.com/?key=${KEY}` } }
			])
		)

		expect(JSON.stringify(event.breadcrumbs)).not.toContain(KEY)
	})

	it('leaves an event with no request alone', () => {
		const event: ErrorEvent = { type: undefined, message: 'boom' }

		expect(scrubEvent(event)).toEqual({ type: undefined, message: 'boom' })
	})
})

describe('scrubBreadcrumb', () => {
	it('removes a key query parameter from a fetch breadcrumb URL', () => {
		const crumb = scrubBreadcrumb({
			category: 'fetch',
			data: {
				url: `https://generativelanguage.googleapis.com/v1beta/models?key=${KEY}`,
				status_code: 200
			}
		})

		expect(crumb?.data?.url).toBe('https://generativelanguage.googleapis.com/v1beta/models')
		expect(crumb?.data?.status_code).toBe(200)
	})

	it('drops body and header data on a provider breadcrumb', () => {
		const crumb = scrubBreadcrumb({
			category: 'xhr',
			data: {
				url: 'https://api.anthropic.com/v1/messages',
				request_body: { prompt: 'user text' },
				request_headers: { 'x-api-key': KEY }
			}
		})

		expect(JSON.stringify(crumb)).not.toContain(KEY)
		expect(JSON.stringify(crumb)).not.toContain('user text')
		expect(crumb?.data?.url).toBe('https://api.anthropic.com/v1/messages')
	})

	it('drops a breadcrumb whose URL carries a presigned credential', () => {
		expect(
			scrubBreadcrumb({
				category: 'fetch',
				data: { url: 'https://bucket.s3.amazonaws.com/f?X-Amz-Signature=abc' }
			})
		).toBeNull()
	})

	it('leaves a breadcrumb with no URL alone', () => {
		const crumb: Breadcrumb = { category: 'ui.click', message: 'button' }

		expect(scrubBreadcrumb(crumb)).toEqual(crumb)
	})
})
