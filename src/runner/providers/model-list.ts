import { z } from 'zod'
import { PROVIDERS, type Provider } from '@/lib/constants'
import { ANTHROPIC_URL, ANTHROPIC_VERSION } from './anthropic'
import { GOOGLE_BASE_URL } from './google'
import { parseProviderJson, timedFetch } from './provider-error'
import { JEV_PROXY_URL } from './typesafe'

const ANTHROPIC_MODELS_URL = ANTHROPIC_URL.replace('/messages', '/models')
const OPENAI_MODELS_URL = 'https://api.openai.com/v1/models'
const OPENROUTER_MODELS_URL = 'https://openrouter.ai/api/v1/models'
const GOOGLE_MODELS_URL = `${GOOGLE_BASE_URL}/models?pageSize=1000`
const TOKENS_PER_MILLION = 1_000_000
// OpenAI's list also holds embeddings, speech, images and moderation, which can't answer a prompt.
const OPENAI_NON_CHAT =
	/embedding|whisper|tts|dall-e|moderation|image|audio|realtime|transcribe|search/

/** A model a key can reach. Prices are per million tokens, set only when the provider publishes them. */
export type ModelOption = { id: string; label: string; inputPerM?: number; outputPerM?: number }

const openAiSchema = z.object({ data: z.array(z.object({ id: z.string() })) })
const anthropicSchema = z.object({
	data: z.array(z.object({ id: z.string(), display_name: z.string().optional() }))
})
const googleSchema = z.object({
	models: z.array(
		z.object({
			name: z.string(),
			displayName: z.string().optional(),
			supportedGenerationMethods: z.array(z.string()).optional()
		})
	)
})
const openRouterSchema = z.object({
	data: z.array(
		z.object({
			id: z.string(),
			name: z.string().optional(),
			pricing: z.object({ prompt: z.string(), completion: z.string() }).optional()
		})
	)
})

// OpenRouter prices are dollars per token as strings; "-1" marks a router with no fixed price.
function perMillion(value: string | undefined): number | undefined {
	const number = Number(value)
	return value !== undefined && Number.isFinite(number) && number >= 0
		? number * TOKENS_PER_MILLION
		: undefined
}

type ListRequest = { url: string; headers: Record<string, string> }

function listRequest(provider: Provider, key: string): ListRequest {
	switch (provider) {
		case PROVIDERS.anthropic:
			return {
				url: ANTHROPIC_MODELS_URL,
				headers: {
					'x-api-key': key,
					'anthropic-version': ANTHROPIC_VERSION,
					'anthropic-dangerous-direct-browser-access': 'true'
				}
			}
		case PROVIDERS.openai:
			return { url: OPENAI_MODELS_URL, headers: { Authorization: `Bearer ${key}` } }
		case PROVIDERS.openrouter:
			return { url: OPENROUTER_MODELS_URL, headers: { Authorization: `Bearer ${key}` } }
		case PROVIDERS.google:
			return { url: GOOGLE_MODELS_URL, headers: { 'x-goog-api-key': key } }
		case PROVIDERS.typesafe:
			return { url: JEV_PROXY_URL, headers: { Authorization: `Bearer ${key}` } }
	}
}

function byLabel(a: ModelOption, b: ModelOption): number {
	return a.label.localeCompare(b.label)
}

/**
 * The models a key can reach, from the provider's own list (R10, R42). It is
 * also the cheap real call behind each key's Test button. TypeSafe's Test goes
 * through /api/jev and returns no models: Jev is picked by the app, not the user.
 */
export async function fetchModels(
	provider: Provider,
	key: string,
	signal?: AbortSignal
): Promise<ModelOption[]> {
	const { url, headers } = listRequest(provider, key)
	const { text, latencyMs } = await timedFetch(url, { method: 'GET', headers }, signal)
	switch (provider) {
		case PROVIDERS.anthropic:
			return parseProviderJson(text, anthropicSchema, latencyMs)
				.data.map((model) => ({ id: model.id, label: model.display_name ?? model.id }))
				.sort(byLabel)
		case PROVIDERS.openai:
			return parseProviderJson(text, openAiSchema, latencyMs)
				.data.filter((model) => !OPENAI_NON_CHAT.test(model.id))
				.map((model) => ({ id: model.id, label: model.id }))
				.sort(byLabel)
		case PROVIDERS.openrouter:
			return parseProviderJson(text, openRouterSchema, latencyMs)
				.data.map((model) => ({
					id: model.id,
					label: model.name ?? model.id,
					inputPerM: perMillion(model.pricing?.prompt),
					outputPerM: perMillion(model.pricing?.completion)
				}))
				.sort(byLabel)
		case PROVIDERS.google:
			return parseProviderJson(text, googleSchema, latencyMs)
				.models.filter((model) => model.supportedGenerationMethods?.includes('generateContent'))
				.map((model) => {
					const id = model.name.replace(/^models\//, '')
					return { id, label: model.displayName ?? id }
				})
				.sort(byLabel)
		case PROVIDERS.typesafe:
			return []
	}
}
