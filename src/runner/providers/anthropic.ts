import { z } from 'zod'
import { CLAUDE_MODELS } from '@/lib/constants'
import type { ProviderResult } from '@/runner/types'
import { parseProviderJson, timedFetch } from './provider-error'

export const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages'
export const ANTHROPIC_VERSION = '2023-06-01'

// Room for Opus 5.5's thinking at low effort plus the short JSON answer.
// Only tokens actually produced are billed.
const ANTHROPIC_MAX_TOKENS = 16000

// Opus 5.5 can't turn thinking off, so it runs at low effort (DESIGN 3.2).
// Every other model runs at its defaults. Methodology states both.
const OPUS_EFFORT = 'low'

const USER_ROLE = 'user'
const TEXT_BLOCK = 'text'

export type AnthropicBody = {
	model: string
	max_tokens: number
	messages: { role: typeof USER_ROLE; content: string }[]
	output_config?: { effort: typeof OPUS_EFFORT }
}

export function buildAnthropicBody(modelId: string, prompt: string): AnthropicBody {
	const body: AnthropicBody = {
		model: modelId,
		max_tokens: ANTHROPIC_MAX_TOKENS,
		messages: [{ role: USER_ROLE, content: prompt }]
	}
	if (modelId === CLAUDE_MODELS.opus) body.output_config = { effort: OPUS_EFFORT }
	return body
}

const messageSchema = z.object({
	model: z.string().min(1),
	content: z.array(z.looseObject({ type: z.string(), text: z.string().optional() })),
	usage: z.object({
		input_tokens: z.number().int().nonnegative(),
		output_tokens: z.number().int().nonnegative()
	})
})

/** Calls the Messages API. Works from the browser and the CLI alike. */
export async function callAnthropic(
	body: AnthropicBody,
	key: string,
	signal?: AbortSignal
): Promise<ProviderResult> {
	const { text, latencyMs } = await timedFetch(
		ANTHROPIC_URL,
		{
			method: 'POST',
			headers: {
				'x-api-key': key,
				'anthropic-version': ANTHROPIC_VERSION,
				'content-type': 'application/json',
				'anthropic-dangerous-direct-browser-access': 'true'
			},
			body: JSON.stringify(body)
		},
		signal
	)
	const message = parseProviderJson(text, messageSchema, latencyMs)
	// Thinking blocks come back empty by default; only text blocks are the answer.
	const answerText = message.content
		.filter((block) => block.type === TEXT_BLOCK)
		.map((block) => block.text ?? '')
		.join('')
	return {
		text: answerText,
		latencyMs,
		usage: { inputTokens: message.usage.input_tokens, outputTokens: message.usage.output_tokens },
		modelId: message.model
	}
}
