import { scrubBreadcrumb, scrubEvent } from '@/lib/observability/scrub'
import { whenIdle } from '@/lib/when-idle'

// The Sentry browser SDK is about 117 KB gzipped and cost 600 ms of main-thread
// time on a throttled phone, so it must not load before the page is usable
// (ROADMAP Step-27). It loads and starts once the browser is idle; a report made
// earlier waits behind the same promise. The trade-off: an error in the first
// second or two, before the SDK starts, is not reported.

type SentrySdk = typeof import('@sentry/nextjs')

let loading: Promise<SentrySdk | null> | null = null

/** Starts loading Sentry (once) and resolves with it, or null if it could not load. */
export function loadSentry(): Promise<SentrySdk | null> {
	loading ??= whenIdle()
		.then(() => import('@sentry/nextjs'))
		.then((sentry) => {
			// Keys and provider bodies are scrubbed before anything leaves the browser.
			sentry.init({
				dsn: process.env.NEXT_PUBLIC_SENTRY_DSN || undefined,
				tracesSampleRate: 0.1,
				enabled: Boolean(process.env.NEXT_PUBLIC_SENTRY_DSN),
				beforeSend: scrubEvent,
				beforeBreadcrumb: scrubBreadcrumb
			})
			return sentry
		})
		.catch(() => null)
	return loading
}

/** Runs `report` with Sentry once it is ready. Reporting can never throw into the app. */
export function reportToSentry(report: (sentry: SentrySdk) => void): void {
	void loadSentry().then((sentry) => {
		if (!sentry) return
		try {
			report(sentry)
		} catch {
			// A failed report must not break the feature it came from.
		}
	})
}
