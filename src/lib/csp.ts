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
