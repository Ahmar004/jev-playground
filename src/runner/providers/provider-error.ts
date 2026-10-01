import type { z } from 'zod'
import { PROVIDER_ERROR_KINDS, type ProviderErrorKind } from '@/lib/constants'

// Enough of an error body to show what went wrong (level 2 shows a 422 body).
const MAX_ERROR_BODY_CHARS = 2000

const KIND_BY_STATUS: Record<number, ProviderErrorKind> = {
	400: PROVIDER_ERROR_KINDS.malformed,
	401: PROVIDER_ERROR_KINDS.invalidKey,
	403: PROVIDER_ERROR_KINDS.forbidden,
	422: PROVIDER_ERROR_KINDS.malformed,
	429: PROVIDER_ERROR_KINDS.rateLimited,
	503: PROVIDER_ERROR_KINDS.overloaded,
	529: PROVIDER_ERROR_KINDS.overloaded
}

export function errorKindForStatus(status: number): ProviderErrorKind {
	return KIND_BY_STATUS[status] ?? PROVIDER_ERROR_KINDS.unknown
}

/** A failed provider call. It carries the kind and status, never the key or the request. */
export class ProviderError extends Error {
	readonly kind: ProviderErrorKind
	readonly status: number | null
	readonly body: string
	readonly latencyMs: number

	constructor(kind: ProviderErrorKind, status: number | null, body: string, latencyMs: number) {
		super(`Provider call failed: ${kind}`)
		this.name = 'ProviderError'
		this.kind = kind
		this.status = status
		this.body = body
		this.latencyMs = latencyMs
	}
}

function isAbort(error: unknown, signal: AbortSignal | undefined): boolean {
	return signal?.aborted === true || (error instanceof DOMException && error.name === 'AbortError')
}

export type TimedResponse = { text: string; latencyMs: number }

/** One request, timed from send to the last body byte, never retried (R7). */
export async function timedFetch(
	url: string,
	init: RequestInit,
	signal?: AbortSignal
): Promise<TimedResponse> {
	const start = performance.now()
	let response: Response
	let text: string
	try {
		response = await fetch(url, { ...init, signal })
		text = await response.text()
	} catch (error) {
		if (isAbort(error, signal)) throw error
		throw new ProviderError(PROVIDER_ERROR_KINDS.network, null, '', performance.now() - start)
	}
	const latencyMs = performance.now() - start
	if (!response.ok) {
		const kind = errorKindForStatus(response.status)
		// An auth failure keeps no body, so nothing about the key is stored or shown.
		const authFailure =
			kind === PROVIDER_ERROR_KINDS.invalidKey || kind === PROVIDER_ERROR_KINDS.forbidden
		const body = authFailure ? '' : text.slice(0, MAX_ERROR_BODY_CHARS)
		throw new ProviderError(kind, response.status, body, latencyMs)
	}
	return { text, latencyMs }
}

/** Parses a 2xx body; a body that doesn't match the provider's shape is an unknown error. */
export function parseProviderJson<T>(text: string, schema: z.ZodType<T>, latencyMs: number): T {
	let json: unknown
	try {
		json = JSON.parse(text)
	} catch {
		json = undefined
	}
	const result = schema.safeParse(json)
	if (!result.success) {
		throw new ProviderError(
			PROVIDER_ERROR_KINDS.unknown,
			null,
			text.slice(0, MAX_ERROR_BODY_CHARS),
			latencyMs
		)
	}
	return result.data
}
