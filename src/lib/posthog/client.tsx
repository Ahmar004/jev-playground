'use client'

import { whenIdle } from '@/lib/when-idle'

// The one low-level posthog-js wrapper. Everything above it — the typed
// track()/capture() API, the convenience wrappers, attribution, identify —
// lives in @/lib/analytics and calls through this. Don't call posthog.capture
// directly from feature code; use @/lib/analytics/track so events stay typed
// against the taxonomy (events.ts, docs/rules/analytics.md).
//
// posthog-js is about 97 KB gzipped and nothing on screen needs it, so it loads
// once the page is idle, like Sentry (src/lib/observability/sentry-client.ts).
// Calls made earlier wait behind the same promise and run in order. The
// trade-off: autocapture and session replay start a second or two late.

type PostHog = (typeof import('posthog-js'))['default']

let loading: Promise<PostHog | null> | null = null
// Set as soon as PostHog has started, before any queued call runs.
let ready: PostHog | null = null

/** Starts loading PostHog (once) and resolves with it, or null without a key or if it could not load. */
export function loadPostHog(): Promise<PostHog | null> {
	const key = process.env.NEXT_PUBLIC_POSTHOG_KEY
	loading ??= key
		? whenIdle()
				.then(() => import('posthog-js'))
				.then(({ default: posthog }) => {
					posthog.init(key, {
						api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST ?? 'https://us.i.posthog.com',
						// Anonymous (R85): no person profile unless identify() runs, and nothing
						// calls it.
						person_profiles: 'identified_only',
						capture_pageview: false, // captured manually on route change — see AnalyticsProvider in src/lib/analytics
						// Session replay never records what a user types. Key inputs also carry
						// the ph-no-capture class, which autocapture and replay skip entirely.
						session_recording: { maskAllInputs: true },
						// We run no surveys, and their script is a 33 KB request on every page.
						disable_surveys: true
					})
					ready = posthog
					return posthog
				})
				.catch(() => null)
		: Promise.resolve(null)
	return loading
}

function run(posthog: PostHog, send: (posthog: PostHog) => void): void {
	try {
		send(posthog)
	} catch {
		// Analytics can never break the feature it's instrumenting.
	}
}

/**
 * Runs `send` with PostHog: at once when it is ready, otherwise once it loads,
 * in the order the calls were made. So an event sent from inside another call
 * goes out right after it, as it did before PostHog loaded lazily. An
 * ad-blocker or PostHog outage must never throw into application code.
 */
export function withPostHog(send: (posthog: PostHog) => void): void {
	if (ready) return run(ready, send)
	void loadPostHog().then((posthog) => {
		if (posthog) run(posthog, send)
	})
}

// session_id is read when the event is sent, since PostHog only knows it once
// it has loaded. Pageview capture lives in @/lib/analytics/analytics-provider
// (AnalyticsProvider), which emits both $pageview and the taxonomy's page_viewed.
export function trackEvent(name: string, properties?: Record<string, unknown>): void {
	withPostHog((posthog) =>
		posthog.capture(name, { session_id: posthog.get_session_id(), ...properties })
	)
}
