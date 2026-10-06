'use client'

import { Suspense, useEffect, useRef } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import { withPostHog } from '@/lib/posthog/client'
import { ANALYTICS_EVENTS } from './events'
import { captureAttribution } from './attribution'
import { track } from './track'

// usePathname from next/navigation: a pageview records the real browser URL.
function AnalyticsProviderInner() {
	const pathname = usePathname()
	const searchParams = useSearchParams()
	const started = useRef(false)

	// Once per session: attribution + app_opened. app_opened marks the start
	// of a session regardless of which page opened it, so it's guarded by
	// PostHog's session id (not just this component mounting) to survive a
	// client-side remount within the same session.
	useEffect(() => {
		if (started.current) return
		started.current = true
		captureAttribution()

		// The session id exists once PostHog has loaded (src/lib/posthog/client.tsx).
		withPostHog((posthog) => {
			const sessionId = posthog.get_session_id()
			const marker = sessionId ? `app_opened:${sessionId}` : undefined
			if (marker && typeof sessionStorage !== 'undefined' && sessionStorage.getItem(marker)) return
			if (marker && typeof sessionStorage !== 'undefined') sessionStorage.setItem(marker, '1')
			track(ANALYTICS_EVENTS.APP_OPENED, {})
		})
	}, [])

	// On every route change: PostHog's native $pageview (its funnels/replay
	// rely on this exact event) plus the taxonomy's page_viewed. Pairs with
	// capture_pageview: false in instrumentation-client.ts — this is the only
	// source of both.
	useEffect(() => {
		if (!pathname) return
		const url = searchParams?.size ? `${pathname}?${searchParams.toString()}` : pathname
		// withPostHog never throws: analytics can never break navigation.
		withPostHog((posthog) => posthog.capture('$pageview', { $current_url: url }))
		track(ANALYTICS_EVENTS.PAGE_VIEWED, { page_name: pathname })
	}, [pathname, searchParams])

	return null
}

// Mount once, near the root layout's providers. useSearchParams requires a
// Suspense boundary; wrapped internally so callers drop it in with no ceremony.
export function AnalyticsProvider() {
	return (
		<Suspense fallback={null}>
			<AnalyticsProviderInner />
		</Suspense>
	)
}
