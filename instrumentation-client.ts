import posthog from 'posthog-js'
import { loadSentry, reportToSentry } from '@/lib/observability/sentry-client'

// Next.js 15.3+ auto-detects this file — no manual import needed anywhere.
// Replaces the old sentry.client.config.ts pattern. Sentry is loaded after the
// page is idle, not here (src/lib/observability/sentry-client.ts): its SDK is
// the heaviest script on every page. This only starts the wait.
void loadSentry()

if (process.env.NEXT_PUBLIC_POSTHOG_KEY) {
	posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY, {
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
}

// Required for Sentry to instrument client-side route transitions; it waits for
// the SDK like every other report.
export function onRouterTransitionStart(href: string, navigationType: string): void {
	reportToSentry((sentry) => sentry.captureRouterTransitionStart(href, navigationType))
}
