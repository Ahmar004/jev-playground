import { loadSentry, reportToSentry } from '@/lib/observability/sentry-client'
import { loadPostHog } from '@/lib/posthog/client'

// Next.js 15.3+ auto-detects this file — no manual import needed anywhere.
// Replaces the old sentry.client.config.ts pattern. Sentry and PostHog load
// after the page is idle, not here (src/lib/observability/sentry-client.ts,
// src/lib/posthog/client.tsx): they are the heaviest scripts on every page.
// This only starts the wait.
void loadSentry()
void loadPostHog()

// Required for Sentry to instrument client-side route transitions; it waits for
// the SDK like every other report.
export function onRouterTransitionStart(href: string, navigationType: string): void {
	reportToSentry((sentry) => sentry.captureRouterTransitionStart(href, navigationType))
}
