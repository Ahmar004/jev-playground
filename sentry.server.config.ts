import * as Sentry from '@sentry/nextjs'
import { scrubBreadcrumb, scrubEvent } from '@/lib/observability/scrub'

// Sentry carries unexpected exceptions someone should be paged about, not the
// record of what happened — that's the logger's job (src/server/lib/logger).
// See docs/rules/logging.md for the division.
Sentry.init({
	dsn: process.env.NEXT_PUBLIC_SENTRY_DSN || undefined,
	tracesSampleRate: 0.1,
	enabled: Boolean(process.env.NEXT_PUBLIC_SENTRY_DSN),
	// Keys and provider bodies never reach Sentry (src/lib/observability/scrub.ts).
	beforeSend: scrubEvent,
	beforeBreadcrumb: scrubBreadcrumb
})
