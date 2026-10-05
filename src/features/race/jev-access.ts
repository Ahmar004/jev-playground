import type { Keys } from '@/features/keys/keys-context'
import { PROVIDERS, type JevProvider } from '@/lib/constants'
import { callOpenRouterJev } from '@/runner/providers/openrouter-jev'
import { callTypeSafe, JEV_PROXY_URL } from '@/runner/providers/typesafe'
import type { JevCall } from '@/runner/racers'

/** How Developer mode reaches Jev: which key answers, and the call with that key bound in. */
export type JevAccess = { provider: JevProvider; call: JevCall }

/**
 * The Jev call the user's keys allow (spec 3.4). A TypeSafe key goes through
 * our pass-through, because TypeSafe blocks browsers; an OpenRouter key goes
 * straight from the browser, so it never reaches our server. TypeSafe wins
 * when both are set: it is the maker's own endpoint and the one the recordings used.
 */
export function jevAccessFor(keys: Keys): JevAccess | null {
	const typesafe = keys[PROVIDERS.typesafe]
	if (typesafe) {
		return {
			provider: PROVIDERS.typesafe,
			call: (body, signal) => callTypeSafe(body, typesafe.key, signal, JEV_PROXY_URL)
		}
	}
	const openrouter = keys[PROVIDERS.openrouter]
	if (openrouter) {
		return {
			provider: PROVIDERS.openrouter,
			call: (body, signal) => callOpenRouterJev(body, openrouter.key, signal)
		}
	}
	return null
}
