import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const sdk = vi.hoisted(() => ({
	init: vi.fn(),
	capture: vi.fn(),
	get_session_id: vi.fn(() => 'session-1'),
	fail: false
}))
vi.mock('posthog-js', () => {
	if (sdk.fail) throw new Error('chunk failed to load')
	return { default: { init: sdk.init, capture: sdk.capture, get_session_id: sdk.get_session_id } }
})

const IDLE_FALLBACK_MS = 1000

async function freshModule() {
	vi.resetModules()
	return import('./client')
}

beforeEach(() => {
	vi.useFakeTimers()
	vi.clearAllMocks()
	sdk.fail = false
	// jsdom has no requestIdleCallback, so the module uses its timeout fallback.
	vi.stubEnv('NEXT_PUBLIC_POSTHOG_KEY', 'phc_test')
})
afterEach(() => {
	vi.useRealTimers()
	vi.unstubAllEnvs()
})

describe('posthog client', () => {
	it('does not load or start PostHog until the page has been idle', async () => {
		const { loadPostHog } = await freshModule()
		void loadPostHog()
		await vi.advanceTimersByTimeAsync(IDLE_FALLBACK_MS - 1)
		expect(sdk.init).not.toHaveBeenCalled()
		await vi.advanceTimersByTimeAsync(2)
		expect(sdk.init).toHaveBeenCalledTimes(1)
	})

	it('starts once with the anonymous, masked settings', async () => {
		const { loadPostHog } = await freshModule()
		void loadPostHog()
		void loadPostHog()
		await vi.advanceTimersByTimeAsync(IDLE_FALLBACK_MS + 1)
		expect(sdk.init).toHaveBeenCalledTimes(1)
		expect(sdk.init).toHaveBeenCalledWith(
			'phc_test',
			expect.objectContaining({
				person_profiles: 'identified_only',
				capture_pageview: false,
				session_recording: { maskAllInputs: true },
				disable_surveys: true
			})
		)
	})

	it('never loads PostHog when there is no key', async () => {
		vi.stubEnv('NEXT_PUBLIC_POSTHOG_KEY', '')
		const { trackEvent } = await freshModule()
		trackEvent('page_viewed', {})
		await vi.advanceTimersByTimeAsync(IDLE_FALLBACK_MS + 1)
		expect(sdk.init).not.toHaveBeenCalled()
		expect(sdk.capture).not.toHaveBeenCalled()
	})

	it('queues an event sent before PostHog is ready, in order, with its session id', async () => {
		const { trackEvent } = await freshModule()
		trackEvent('app_opened', { page_name: '/' })
		trackEvent('page_viewed', { page_name: '/' })
		expect(sdk.capture).not.toHaveBeenCalled()
		await vi.advanceTimersByTimeAsync(IDLE_FALLBACK_MS + 1)
		expect(sdk.capture.mock.calls).toEqual([
			['app_opened', { session_id: 'session-1', page_name: '/' }],
			['page_viewed', { session_id: 'session-1', page_name: '/' }]
		])
	})

	it('runs a call made inside another one right after it, ahead of later queued calls', async () => {
		const { trackEvent, withPostHog } = await freshModule()
		withPostHog(() => trackEvent('app_opened', {}))
		trackEvent('page_viewed', {})
		await vi.advanceTimersByTimeAsync(IDLE_FALLBACK_MS + 1)
		expect(sdk.capture.mock.calls.map(([name]) => name)).toEqual(['app_opened', 'page_viewed'])
	})

	it('never throws into the app when PostHog cannot load or a call fails', async () => {
		sdk.fail = true
		const failing = await freshModule()
		failing.trackEvent('page_viewed', {})
		await vi.advanceTimersByTimeAsync(IDLE_FALLBACK_MS + 1)

		sdk.fail = false
		const working = await freshModule()
		working.withPostHog(() => {
			throw new Error('capture blew up')
		})
		await expect(vi.advanceTimersByTimeAsync(IDLE_FALLBACK_MS + 1)).resolves.not.toThrow()
	})
})
