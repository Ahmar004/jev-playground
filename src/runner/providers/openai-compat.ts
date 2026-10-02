import { z } from 'zod'
import type { ProviderResult } from '@/runner/types'
import { parseProviderJson, timedFetch } from './provider-error'

export const OPENAI_URL = 'https://api.openai.com/v1/chat/completions'
export const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions'

// Room for a reasoning model's thinking plus the short JSON answer; only tokens produced are billed.
const MAX_COMPLETION_TOKENS = 16000

const completionSchema = z.object({
	model: z.string().min(1),
	choices: z.array(z.object({ message: z.object({ content: z.string().nullable() }) })).min(1),
	usage: z.object({
		prompt_tokens: z.number().int().nonnegative(),
		completion_tokens: z.number().int().nonnegative()
	})
})

/** One chat completion in the OpenAI shape, which OpenAI and OpenRouter both speak. */
export async function callChatCompletion(
	url: string,
	modelId: string,
	prompt: string,
	key: string,
	signal?: AbortSignal
): Promise<ProviderResult> {
	const { text, latencyMs } = await timedFetch(
		url,
		{
			method: 'POST',
			headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
			body: JSON.stringify({
				model: modelId,
				max_completion_tokens: MAX_COMPLETION_TOKENS,
				messages: [{ role: 'user', content: prompt }]
			})
		},
		signal
	)
	const completion = parseProviderJson(text, completionSchema, latencyMs)
	return {
		text: completion.choices[0]?.message.content ?? '',
		latencyMs,
		usage: {
			inputTokens: completion.usage.prompt_tokens,
			outputTokens: completion.usage.completion_tokens
		},
		modelId: completion.model
	}
}

export function callOpenAi(modelId: string, prompt: string, key: string, signal?: AbortSignal) {
	return callChatCompletion(OPENAI_URL, modelId, prompt, key, signal)
}

export function callOpenRouter(modelId: string, prompt: string, key: string, signal?: AbortSignal) {
	return callChatCompletion(OPENROUTER_URL, modelId, prompt, key, signal)
}
