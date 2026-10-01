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

/**
 * Calls Jev directly (the recording CLI). Browser calls go through /api/jev
 * instead, because TypeSafe blocks CORS (spec 2.3); that path is slice 8.
 */
export async function callTypeSafe(
	body: JevRequestBody,
	key: string,
	signal?: AbortSignal
): Promise<ProviderResult> {
	const { text, latencyMs } = await timedFetch(
		TYPESAFE_URL,
		{
			method: 'POST',
			headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
			body: JSON.stringify(body)
		},
		signal
	)
	const envelope = parseProviderJson(text, envelopeSchema, latencyMs)
	return {
		text,
		latencyMs,
		usage: { inputTokens: envelope.usage.input_tokens, outputTokens: envelope.usage.output_tokens },
		modelId: envelope.model
	}
}
