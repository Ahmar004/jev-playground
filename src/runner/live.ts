import { RUN_STOPPING_ERRORS } from '@/lib/constants'
import { ProviderError } from './providers/provider-error'
import type { ItemRunner } from './types'

/**
 * Wraps a live racer so a failure that would repeat on every remaining call
 * (a bad key, a rate limit, an outage) stops the run with a ProviderError
 * instead of spending the user's calls on it (R21, R82). Any other result,
 * including an item the provider rejected as malformed, is kept as a result.
 */
export function stopOnProviderFailure(runItem: ItemRunner): ItemRunner {
	return async (item, signal) => {
		const result = await runItem(item, signal)
		if (result.error && RUN_STOPPING_ERRORS.includes(result.error)) {
			throw new ProviderError(result.error, null, '', result.latencyMs)
		}
		return result
	}
}
