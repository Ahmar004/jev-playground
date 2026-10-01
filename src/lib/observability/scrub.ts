import type { Breadcrumb, ErrorEvent } from '@sentry/nextjs'

// Keys never reach Sentry (Rule-8, spec 4, DESIGN 12). Every Sentry init runs
// events through scrubEvent and breadcrumbs through scrubBreadcrumb. Sentry's
// own server-side scrubbers are a second layer, not the one we rely on.

// The headers a provider key travels in. Compared lowercase.
const KEY_HEADERS = new Set(['authorization', 'x-api-key', 'x-goog-api-key'])

// Calls whose body holds a key, a prompt or user task text: the five model
// providers, and our TypeSafe pass-through.
const PROVIDER_URL =
	/^https:\/\/(openrouter\.ai|api\.anthropic\.com|api\.openai\.com|generativelanguage\.googleapis\.com|api\.typesafe\.ai)\/|\/api\/jev(\/|\?|$)/i

// Google accepts a key as `?key=`. We always send it in a header, but strip
// the parameter anywhere a URL is recorded, in case one ever slips through.
const KEY_PARAM = 'key'

// A presigned URL's query string is itself the credential, so a breadcrumb
// recording one is dropped whole (S3/R2, GCS, Azure SAS).
const PRESIGNED_CREDENTIAL =
	/[?&](x-amz-(signature|credential|security-token)|x-goog-signature|googleaccessid|signature|sig)=/i

// Breadcrumb data fields that can carry a body or headers.
const BREADCRUMB_PAYLOAD_FIELDS = [
	'request_body',
	'response_body',
	'request_headers',
	'response_headers',
	'body'
]

function isProviderUrl(url: string | undefined): boolean {
	return url != null && PROVIDER_URL.test(url)
}

function stripKeyParam(url: string): string {
	const queryAt = url.indexOf('?')
	if (queryAt === -1) return url
	const params = new URLSearchParams(url.slice(queryAt + 1))
	if (!params.has(KEY_PARAM)) return url
	params.delete(KEY_PARAM)
	const query = params.toString()
	return query === '' ? url.slice(0, queryAt) : `${url.slice(0, queryAt)}?${query}`
}

function scrubQueryString(
	query: NonNullable<ErrorEvent['request']>['query_string']
): NonNullable<ErrorEvent['request']>['query_string'] {
	if (query == null) return query
	if (typeof query === 'string') return stripKeyParam(`?${query}`).slice(1)
	if (Array.isArray(query)) return query.filter(([name]) => name !== KEY_PARAM)
	const rest = { ...query }
	delete rest[KEY_PARAM]
	return rest
}

function withoutKeyHeaders(headers: Record<string, string>): Record<string, string> {
	return Object.fromEntries(
		Object.entries(headers).filter(([name]) => !KEY_HEADERS.has(name.toLowerCase()))
	)
}

export function scrubBreadcrumb(breadcrumb: Breadcrumb): Breadcrumb | null {
	const url: unknown = breadcrumb.data?.url
	if (typeof url !== 'string') return breadcrumb
	if (PRESIGNED_CREDENTIAL.test(url)) return null

	const data: Record<string, unknown> = { ...breadcrumb.data, url: stripKeyParam(url) }
	if (isProviderUrl(url)) {
		for (const field of BREADCRUMB_PAYLOAD_FIELDS) delete data[field]
	}
	return { ...breadcrumb, data }
}

export function scrubEvent<T extends ErrorEvent>(event: T): T {
	const scrubbed = { ...event }

	if (event.request != null) {
		const request = { ...event.request }
		if (request.headers != null) request.headers = withoutKeyHeaders(request.headers)
		if (isProviderUrl(request.url)) delete request.data
		if (request.url != null) request.url = stripKeyParam(request.url)
		if (request.query_string != null) request.query_string = scrubQueryString(request.query_string)
		scrubbed.request = request
	}

	if (event.breadcrumbs != null) {
		scrubbed.breadcrumbs = event.breadcrumbs
			.map(scrubBreadcrumb)
			.filter((crumb): crumb is Breadcrumb => crumb != null)
	}

	return scrubbed
}
