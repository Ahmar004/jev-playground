import { z } from 'zod'
import type { ProviderResult } from '@/runner/types'
import { parseProviderJson, timedFetch } from './provider-error'

export const GOOGLE_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta'

const responseSchema = z.object({
	candidates: z
		.array(
			z.object({ content: z.object({ parts: z.array(z.object({ text: z.string().optional() })) }) })
		)
		.min(1),
	usageMetadata: z.object({
		promptTokenCount: z.number().int().nonnegative(),
		candidatesTokenCount: z.number().int().nonnegative().optional(),
		// Thinking tokens are billed as output.
		thoughtsTokenCount: z.number().int().nonnegative().optional()
	}),
	modelVersion: z.string().optional()
})

/** Calls Gemini. The key goes in the x-goog-api-key header, never in the URL (R15). */
export async function callGoogle(
	modelId: string,
	prompt: string,
	key: string,
	signal?: AbortSignal
): Promise<ProviderResult> {
	const { text, latencyMs } = await timedFetch(
		`${GOOGLE_BASE_URL}/models/${encodeURIComponent(modelId)}:generateContent`,
		{
			method: 'POST',
			headers: { 'x-goog-api-key': key, 'Content-Type': 'application/json' },
			body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: prompt }] }] })
		},
		signal
	)
	const response = parseProviderJson(text, responseSchema, latencyMs)
	const { usageMetadata } = response
	return {
		text: (response.candidates[0]?.content.parts ?? []).map((part) => part.text ?? '').join(''),
		latencyMs,
		usage: {
			inputTokens: usageMetadata.promptTokenCount,
			outputTokens:
				(usageMetadata.candidatesTokenCount ?? 0) + (usageMetadata.thoughtsTokenCount ?? 0)
		},
		modelId: response.modelVersion ?? modelId
	}
}
