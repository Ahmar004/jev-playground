import { z } from 'zod'
import type { PriceTable } from '@/content/prices'
import { PROVIDERS, type Provider } from '@/lib/constants'
import { priceFor } from '@/runner/cost'
import { ANTHROPIC_URL, ANTHROPIC_VERSION } from './anthropic'
import { GOOGLE_BASE_URL } from './google'
import { parseProviderJson, timedFetch } from './provider-error'
import { JEV_PROXY_URL } from './typesafe'

// The API returns 20 models a page by default; 1000 is its page maximum.
const ANTHROPIC_MODELS_URL = `${ANTHROPIC_URL.replace('/messages', '/models')}?limit=1000`
const OPENAI_MODELS_URL = 'https://api.openai.com/v1/models'
const OPENROUTER_MODELS_URL = 'https://openrouter.ai/api/v1/models'
const GOOGLE_MODELS_URL = `${GOOGLE_BASE_URL}/models?pageSize=1000`
const TOKENS_PER_MILLION = 1_000_000
// OpenAI's list also holds embeddings, speech, images and moderation, which can't answer a prompt.
const OPENAI_NON_CHAT =
	/embedding|whisper|tts|dall-e|moderation|image|audio|realtime|transcribe|search/
// Google's list also marks speech, image, music, agent, research, computer-use, robotics and live
// audio models as able to generate content, but none answers a text question with text.
const GOOGLE_NON_TEXT =
	/tts|image|banana|lyria|robotics|computer.use|deep.research|antigravity|transcribe|embedding|aqa|imagen|veo|live/
// TypeSafe's own models are Jev, which races the LLM rather than playing it.
const TYPESAFE_PREFIX = 'typesafe/'
const TEXT_MODALITY = 'text'

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
			pricing: z.object({ prompt: z.string(), completion: z.string() }).optional(),
			architecture: z.object({ output_modalities: z.array(z.string()).optional() }).optional()
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

// An image or audio model also lists text among its outputs, so only a text-only one can race.
function answersInTextOnly(outputs: string[] | undefined): boolean {
	return outputs === undefined || (outputs.length === 1 && outputs[0] === TEXT_MODALITY)
}

function pricePerM(model: ModelOption, prices: PriceTable, on: Date): number | undefined {
	if (model.inputPerM !== undefined && model.outputPerM !== undefined)
		return model.inputPerM + model.outputPerM
	const entry = priceFor(prices, [model.id], on)
	return entry ? entry.inputPerM + entry.outputPerM : undefined
}

/**
 * The model a live run starts with: the cheapest one with a known, non-zero price, so a first run
 * costs a fraction of a cent and always shows its cost. Falls back to the first model.
 */
export function cheapestPricedModel(
	models: ModelOption[],
	prices: PriceTable,
	on: Date = new Date()
): string | undefined {
	let cheapest: { id: string; price: number } | undefined
	for (const model of models) {
		const price = pricePerM(model, prices, on)
		if (price !== undefined && price > 0 && (!cheapest || price < cheapest.price))
			cheapest = { id: model.id, price }
	}
	return cheapest?.id ?? models[0]?.id
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
				.data.filter(
					(model) =>
						!model.id.startsWith(TYPESAFE_PREFIX) &&
						answersInTextOnly(model.architecture?.output_modalities)
				)
				.map((model) => ({
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
				.filter((model) => !GOOGLE_NON_TEXT.test(`${model.id} ${model.label}`.toLowerCase()))
				.sort(byLabel)
		case PROVIDERS.typesafe:
			return []
	}
}
