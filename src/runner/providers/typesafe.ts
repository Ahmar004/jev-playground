import { z } from 'zod'
import type { JevRequestBody, ProviderResult } from '@/runner/types'
import { parseProviderJson, timedFetch } from './provider-error'

export const TYPESAFE_URL = 'https://api.typesafe.ai/v1/systemone'

// The parts of the response the provider needs; parse.ts validates the answers.
const envelopeSchema = z.object({
	model: z.string().min(1),
	answers: z.record(z.string(), z.unknown()),
	usage: z.object({
		input_tokens: z.number().int().nonnegative(),
		output_tokens: z.number().int().nonnegative()
	})
})

// Browser calls go through our server, because TypeSafe blocks CORS (spec 2.3, DESIGN 5.3).
export const JEV_PROXY_URL = '/api/jev'

// The pass-through reports TypeSafe's own time, so the hop through our server isn't counted.
const UPSTREAM_TIMING = /upstream;dur=([0-9.]+)/

/** The upstream duration from a `Server-Timing` header, or null when absent. */
export function upstreamMs(serverTiming: string | null): number | null {
	const match = serverTiming ? UPSTREAM_TIMING.exec(serverTiming) : null
	return match?.[1] ? Number(match[1]) : null
}

/** Calls Jev directly (the recording CLI), or through /api/jev with `url` set (the browser). */
export async function callTypeSafe(
	body: JevRequestBody,
	key: string,
	signal?: AbortSignal,
	url: string = TYPESAFE_URL
): Promise<ProviderResult> {
	const timed = await timedFetch(
		url,
		{
			method: 'POST',
			headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
			body: JSON.stringify(body)
		},
		signal
	)
	const { text } = timed
	const latencyMs =
		(url === JEV_PROXY_URL ? upstreamMs(timed.serverTiming) : null) ?? timed.latencyMs
	const envelope = parseProviderJson(text, envelopeSchema, latencyMs)
	return {
		text,
		latencyMs,
		usage: { inputTokens: envelope.usage.input_tokens, outputTokens: envelope.usage.output_tokens },
		modelId: envelope.model
	}
}
