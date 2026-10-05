// The browser may send requests only to these hosts. If a script were ever
// injected, the browser would still refuse to send an API key anywhere else
// (DESIGN 5.4, Rule-8). Only connect-src is set: it is the directive that
// governs fetch, XHR and WebSocket.

const PROVIDER_HOSTS = [
	'https://openrouter.ai',
	'https://api.anthropic.com',
	'https://api.openai.com',
	'https://generativelanguage.googleapis.com'
]
const OBSERVABILITY_HOSTS = [
	'https://us.i.posthog.com',
	'https://us-assets.i.posthog.com',
	'https://*.ingest.us.sentry.io',
	'https://*.ingest.sentry.io'
]

export function connectSrc({
	supabaseUrl,
	posthogHost,
	development
}: {
	supabaseUrl?: string
	posthogHost?: string
	development: boolean
}): string {
	const hosts = [
		"'self'",
		...PROVIDER_HOSTS,
		...OBSERVABILITY_HOSTS,
		...(supabaseUrl ? [new URL(supabaseUrl).origin] : []),
		...(posthogHost ? [new URL(posthogHost).origin] : []),
		// next dev's hot reload runs over a WebSocket; production stays strict.
		...(development ? ['ws:'] : [])
	]
	return `connect-src ${[...new Set(hosts)].join(' ')}`
}

// Directives that cannot break Next.js's inline scripts, so they need no nonce:
// nobody may frame the app, and nothing may change the base URL, post a form
// off-site or load a plugin. Script and style sources stay open on purpose.
const HARDENING_DIRECTIVES = [
	"frame-ancestors 'none'",
	"base-uri 'self'",
	"form-action 'self'",
	"object-src 'none'"
]

/** The whole Content-Security-Policy header value. */
export function contentSecurityPolicy(options: Parameters<typeof connectSrc>[0]): string {
	return [connectSrc(options), ...HARDENING_DIRECTIVES].join('; ')
}

const HSTS_TWO_YEARS_SECONDS = 63072000

// Sent on every response (ROADMAP Step-20). Browsers ignore HSTS over plain
// http, so localhost is unaffected. The referrer policy keeps a shared result's
// URL from leaking to the provider pages the app links to.
export const SECURITY_HEADERS = [
	{
		key: 'Strict-Transport-Security',
		value: `max-age=${HSTS_TWO_YEARS_SECONDS}; includeSubDomains`
	},
	{ key: 'X-Content-Type-Options', value: 'nosniff' },
	{ key: 'X-Frame-Options', value: 'DENY' },
	{ key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
	{ key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' }
]
