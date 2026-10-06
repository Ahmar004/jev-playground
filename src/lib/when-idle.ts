// Resolves once the browser is idle (or after a short wait where it can't
// say), so a script that isn't needed to use the page loads after it is usable.

const IDLE_TIMEOUT_MS = 3000
const IDLE_FALLBACK_MS = 1000

export function whenIdle(): Promise<void> {
	return new Promise((resolve) => {
		if (typeof requestIdleCallback === 'function') {
			requestIdleCallback(() => resolve(), { timeout: IDLE_TIMEOUT_MS })
		} else {
			setTimeout(resolve, IDLE_FALLBACK_MS)
		}
	})
}
