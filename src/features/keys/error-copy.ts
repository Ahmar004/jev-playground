import {
	PROVIDER_ERROR_KINDS,
	PROVIDER_LABELS,
	type Provider,
	type ProviderErrorKind
} from '@/lib/constants'

/** A friendly, plain-language message for a failed provider call (R21, R82). Never includes the key. */
export function providerErrorMessage(kind: ProviderErrorKind, provider: Provider): string {
	const name = PROVIDER_LABELS[provider]
	switch (kind) {
		case PROVIDER_ERROR_KINDS.invalidKey:
			return `${name} did not accept this key. Check that you pasted all of it, then try again.`
		case PROVIDER_ERROR_KINDS.forbidden:
			return `This ${name} key is not allowed to do that. It may lack permission for this model.`
		case PROVIDER_ERROR_KINDS.rateLimited:
			return `${name} says you have made too many requests. Wait a moment, then retry.`
		case PROVIDER_ERROR_KINDS.overloaded:
			return `${name} is overloaded right now. Retry in a moment.`
		case PROVIDER_ERROR_KINDS.malformed:
			return `${name} could not read the request.`
		case PROVIDER_ERROR_KINDS.network:
			return `Could not reach ${name}. Check your connection, or whether ${name} is down.`
		case PROVIDER_ERROR_KINDS.timeout:
			return `${name} took too long to answer, so the call was stopped. Retry in a moment.`
		case PROVIDER_ERROR_KINDS.unknown:
			return `${name} gave an answer we could not read.`
	}
}
