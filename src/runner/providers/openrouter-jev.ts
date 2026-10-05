import { OPENROUTER_JEV_MODEL } from '@/lib/constants'
import type { JevRequestBody, ProviderResult } from '@/runner/types'
import { callTypeSafe } from './typesafe'

// OpenRouter serves Jev at its own route, with the same request and answers as TypeSafe's
// (checked with a real request, spec 2.1). Browsers may call it directly (spec 2.3).
export const OPENROUTER_JEV_URL = 'https://openrouter.ai/api/v1/systemone'

/** One Jev call with an OpenRouter key: the same body, with OpenRouter's model id. */
export function callOpenRouterJev(
	body: JevRequestBody,
	key: string,
	signal?: AbortSignal
): Promise<ProviderResult> {
	return callTypeSafe({ ...body, model: OPENROUTER_JEV_MODEL }, key, signal, OPENROUTER_JEV_URL)
}
