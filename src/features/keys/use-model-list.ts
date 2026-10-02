'use client'

import { useQuery } from '@tanstack/react-query'
import { PROVIDER_ERROR_KINDS, type Provider, type ProviderErrorKind } from '@/lib/constants'
import { fetchModels } from '@/runner/providers/model-list'
import { ProviderError } from '@/runner/providers/provider-error'
import { useKeys } from './keys-context'

const MODEL_LIST_STALE_MS = 5 * 60 * 1000

export function errorKind(error: unknown): ProviderErrorKind {
	return error instanceof ProviderError ? error.kind : PROVIDER_ERROR_KINDS.unknown
}

/**
 * The models a provider's key can reach (R10, R42). The query key holds the
 * provider and the key's id, never the key. The same call is the Test button.
 */
export function useModelList(provider: Provider) {
	const entry = useKeys().keys[provider]
	return useQuery({
		queryKey: ['models', provider, entry?.keyId],
		queryFn: ({ signal }) => (entry ? fetchModels(provider, entry.key, signal) : []),
		enabled: Boolean(entry),
		retry: false,
		staleTime: MODEL_LIST_STALE_MS
	})
}
