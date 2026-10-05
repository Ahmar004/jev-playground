'use client'

import { useState } from 'react'
import { PRICES, type PriceTable } from '@/content/prices'
import { useKeys } from '@/features/keys/keys-context'
import { useModelList } from '@/features/keys/use-model-list'
import {
	JEV_MODEL_ALIAS,
	LLM_PROVIDERS,
	PROVIDERS,
	type JevProvider,
	type LlmProvider
} from '@/lib/constants'
import { buildAnthropicBody, callAnthropic } from '@/runner/providers/anthropic'
import { callGoogle } from '@/runner/providers/google'
import { callOpenAi, callOpenRouter } from '@/runner/providers/openai-compat'
import type { JevCall, LlmCall } from '@/runner/racers'
import type { ProviderResult } from '@/runner/types'
import { jevAccessFor } from './jev-access'
import type { LiveConfig } from './live-config'

export const NO_JEV_KEY = 'Add your TypeSafe key or an OpenRouter key, so Jev can answer.'

function llmCallFor(provider: LlmProvider, modelId: string, key: string): LlmCall {
	switch (provider) {
		case PROVIDERS.anthropic:
			return (prompt, signal) => callAnthropic(buildAnthropicBody(modelId, prompt), key, signal)
		case PROVIDERS.openai:
			return (prompt, signal) => callOpenAi(modelId, prompt, key, signal)
		case PROVIDERS.google:
			return (prompt, signal) => callGoogle(modelId, prompt, key, signal)
		case PROVIDERS.openrouter:
			return (prompt, signal) => callOpenRouter(modelId, prompt, key, signal)
	}
}

export type LiveSetup = {
	// The LLM providers the user has a key for.
	providers: LlmProvider[]
	provider: LlmProvider | undefined
	setProvider: (provider: LlmProvider) => void
	models: { id: string; label: string }[]
	modelsLoading: boolean
	modelId: string | undefined
	setModelId: (modelId: string) => void
	// What is still missing before a live run can start, in plain words; null when ready.
	missing: string | null
	config: LiveConfig | null
	// Jev alone, for a level that asks only Jev (level 8's own trick); null without a Jev key.
	jev: { call: JevCall; provider: JevProvider; modelId: string } | null
}

/**
 * Developer mode's setup: which LLM Jev races (from the models the user's key
 * can reach, R10, R42) and the live calls with the keys bound in. Jev needs a
 * TypeSafe key (through /api/jev, DESIGN 5.3) or an OpenRouter key (direct, spec 3.4).
 */
export function useLiveSetup(): LiveSetup {
	const { keys } = useKeys()
	const providers = LLM_PROVIDERS.filter((provider) => keys[provider])
	const [chosenProvider, setProvider] = useState<LlmProvider | undefined>()
	const [chosenModel, setModelId] = useState<string | undefined>()
	const [answered, setAnswered] = useState<LiveConfig['answered']>({})
	// A removed key falls back to the first provider that still has one.
	const provider =
		chosenProvider && providers.includes(chosenProvider) ? chosenProvider : providers[0]
	const list = useModelList(provider ?? PROVIDERS.anthropic)
	const models = provider ? (list.data ?? []) : []
	const modelId =
		chosenModel && models.some((model) => model.id === chosenModel) ? chosenModel : models[0]?.id

	const jevAccess = jevAccessFor(keys)
	const llmKey = provider ? keys[provider] : undefined
	let missing: string | null = null
	if (!jevAccess) missing = NO_JEV_KEY
	else if (!provider || !llmKey)
		missing = 'Add a key for the LLM Jev races: Anthropic, OpenAI, Google or OpenRouter.'
	else if (!modelId)
		missing = list.isFetching ? 'Loading your models...' : 'No model is available for this key.'

	const jevCall: JevCall | null = jevAccess
		? async (body, signal) => {
				const result = await jevAccess.call(body, signal)
				noteAnswered('jev', result)
				return result
			}
		: null

	let config: LiveConfig | null = null
	if (!missing && jevCall && jevAccess && provider && llmKey && modelId) {
		const picked = models.find((model) => model.id === modelId)
		// Only OpenRouter publishes prices with its model list; other models use content/prices.json.
		const prices: PriceTable =
			picked?.inputPerM !== undefined && picked.outputPerM !== undefined
				? {
						...PRICES,
						models: {
							...PRICES.models,
							[modelId]: {
								provider: PROVIDERS.openrouter,
								inputPerM: picked.inputPerM,
								outputPerM: picked.outputPerM,
								source: 'https://openrouter.ai/api/v1/models'
							}
						}
					}
				: PRICES
		const llmCall = llmCallFor(provider, modelId, llmKey.key)
		config = {
			jevCall,
			jevProvider: jevAccess.provider,
			llmCall: async (prompt, signal) => {
				const result = await llmCall(prompt, signal)
				noteAnswered('llm', result)
				return result
			},
			llmProvider: provider,
			llmModelId: modelId,
			prices,
			answered
		}
	}

	function noteAnswered(racer: 'jev' | 'llm', result: ProviderResult): void {
		setAnswered((current) =>
			current[racer] === result.modelId ? current : { ...current, [racer]: result.modelId }
		)
	}

	return {
		providers,
		provider,
		setProvider,
		models,
		modelsLoading: list.isFetching,
		modelId,
		setModelId,
		missing,
		config,
		jev:
			jevCall && jevAccess
				? { call: jevCall, provider: jevAccess.provider, modelId: answered.jev ?? JEV_MODEL_ALIAS }
				: null
	}
}
