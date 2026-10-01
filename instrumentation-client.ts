import * as Sentry from '@sentry/nextjs'
import posthog from 'posthog-js'
import { scrubBreadcrumb, scrubEvent } from '@/lib/observability/scrub'

// Next.js 15.3+ auto-detects this file — no manual import needed anywhere.
// Replaces the old sentry.client.config.ts pattern. Keys and provider bodies
// are scrubbed before anything leaves the browser (src/lib/observability/scrub.ts).
Sentry.init({
	dsn: process.env.NEXT_PUBLIC_SENTRY_DSN || undefined,
	tracesSampleRate: 0.1,
	enabled: Boolean(process.env.NEXT_PUBLIC_SENTRY_DSN),
	beforeSend: scrubEvent,
	beforeBreadcrumb: scrubBreadcrumb
})

if (process.env.NEXT_PUBLIC_POSTHOG_KEY) {
	posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY, {
		api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST ?? 'https://us.i.posthog.com',
		// Anonymous (R85): no person profile unless identify() runs, and nothing
		// calls it.
		person_profiles: 'identified_only',
		capture_pageview: false, // captured manually on route change — see AnalyticsProvider in src/lib/analytics
		// Session replay never records what a user types. Key inputs also carry
		// the ph-no-capture class, which autocapture and replay skip entirely.
		session_recording: { maskAllInputs: true }
	})
}

// Required for Sentry to instrument client-side route transitions.
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart
