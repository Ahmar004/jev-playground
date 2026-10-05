import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const sdk = vi.hoisted(() => ({
	init: vi.fn(),
	captureException: vi.fn(),
	captureRouterTransitionStart: vi.fn(),
	fail: false
}))
vi.mock('@sentry/nextjs', () => {
	if (sdk.fail) throw new Error('chunk failed to load')
	return {
		init: sdk.init,
		captureException: sdk.captureException,
		captureRouterTransitionStart: sdk.captureRouterTransitionStart
	}
})

const IDLE_FALLBACK_MS = 1000

async function freshModule() {
	vi.resetModules()
	return import('./sentry-client')
}

beforeEach(() => {
	vi.useFakeTimers()
	vi.clearAllMocks()
	sdk.fail = false
	// jsdom has no requestIdleCallback, so the module uses its timeout fallback.
	vi.stubEnv('NEXT_PUBLIC_SENTRY_DSN', 'https://key@example.ingest.sentry.io/1')
})
afterEach(() => {
	vi.useRealTimers()
	vi.unstubAllEnvs()
})

describe('sentry-client', () => {
	it('does not load or start the SDK until the page has been idle', async () => {
		const { loadSentry } = await freshModule()
		void loadSentry()
		await vi.advanceTimersByTimeAsync(IDLE_FALLBACK_MS - 1)
		expect(sdk.init).not.toHaveBeenCalled()
		await vi.advanceTimersByTimeAsync(2)
		expect(sdk.init).toHaveBeenCalledTimes(1)
	})

	it('starts once however many callers ask, with scrubbing and the DSN switch', async () => {
		const { loadSentry } = await freshModule()
		void loadSentry()
		void loadSentry()
		await vi.advanceTimersByTimeAsync(IDLE_FALLBACK_MS + 1)
		expect(sdk.init).toHaveBeenCalledTimes(1)
		const options = sdk.init.mock.calls[0]?.[0]
		expect(options).toMatchObject({ enabled: true, tracesSampleRate: 0.1 })
		expect(typeof options.beforeSend).toBe('function')
		expect(typeof options.beforeBreadcrumb).toBe('function')
	})

	it('is switched off when there is no DSN', async () => {
		vi.stubEnv('NEXT_PUBLIC_SENTRY_DSN', '')
		const { loadSentry } = await freshModule()
		void loadSentry()
		await vi.advanceTimersByTimeAsync(IDLE_FALLBACK_MS + 1)
		expect(sdk.init.mock.calls[0]?.[0]).toMatchObject({ enabled: false })
	})

	it('queues a report made before the SDK is ready and sends it once it is', async () => {
		const { reportToSentry } = await freshModule()
		const error = new Error('boom')
		reportToSentry((sentry) => sentry.captureException(error, { extra: { digest: 'd1' } }))
		expect(sdk.captureException).not.toHaveBeenCalled()
		await vi.advanceTimersByTimeAsync(IDLE_FALLBACK_MS + 1)
		expect(sdk.captureException).toHaveBeenCalledWith(error, { extra: { digest: 'd1' } })
	})

	it('never throws into the app when the SDK cannot load or a report fails', async () => {
		sdk.fail = true
		const failing = await freshModule()
		failing.reportToSentry(() => {})
		await vi.advanceTimersByTimeAsync(IDLE_FALLBACK_MS + 1)

		sdk.fail = false
		const working = await freshModule()
		working.reportToSentry(() => {
			throw new Error('capture blew up')
		})
		await expect(vi.advanceTimersByTimeAsync(IDLE_FALLBACK_MS + 1)).resolves.not.toThrow()
	})
})
