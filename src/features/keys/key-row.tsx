'use client'

import { useId, useState } from 'react'
import { Button } from '@/components/ui/button'
import { ExternalLinkIcon, SpinnerIcon, SuccessIcon, WrongIcon } from '@/components/ui/icons'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { PROVIDERS, PROVIDER_KEY_PAGES, PROVIDER_LABELS, type Provider } from '@/lib/constants'
import { providerErrorMessage } from './error-copy'
import { useKeys } from './keys-context'
import { errorKind, useModelList } from './use-model-list'

// Where each key goes and what happens to it, in plain language (R18, R19).
const KEY_COPY: Record<Provider, string> = {
	typesafe:
		'Used for Jev. TypeSafe blocks calls from browsers, so your key goes to our server, which forwards it to TypeSafe and returns the answer. The server does not store or log your key or what you send.',
	openrouter:
		'Used for the LLM, and for Jev when you have no TypeSafe key. Sent straight from your browser to OpenRouter. It never reaches our server.',
	anthropic:
		'Used for the LLM. Sent straight from your browser to Anthropic. It never reaches our server.',
	openai:
		'Used for the LLM. Sent straight from your browser to OpenAI. It never reaches our server.',
	google:
		'Used for the LLM. Sent straight from your browser to Google, in a request header. It never reaches our server.'
}

/** One provider: paste a key, see it tested, remove it. The key only ever lives in memory. */
export function KeyRow({ provider }: { provider: Provider }) {
	const { keys, setKey, removeKey } = useKeys()
	const [draft, setDraft] = useState('')
	const inputId = useId()
	const entry = keys[provider]
	const models = useModelList(provider)
	const name = PROVIDER_LABELS[provider]

	function save(): void {
		if (!draft.trim()) return
		setKey(provider, draft)
		setDraft('')
	}

	return (
		<li className="border-border flex flex-col gap-3 border-b py-4">
			<h3 className="text-text font-bold">{name}</h3>
			<p className="text-text-muted text-sm">{KEY_COPY[provider]}</p>
			{entry ? (
				<div className="flex flex-col gap-2">
					<p role="status" className="text-text flex items-center gap-2 text-sm">
						{models.isFetching ? (
							<>
								<SpinnerIcon /> Testing the key...
							</>
						) : models.isError ? (
							<>
								<WrongIcon className="text-danger shrink-0" />
								{providerErrorMessage(errorKind(models.error), provider)}
							</>
						) : (
							<>
								<SuccessIcon className="text-success shrink-0" />
								Key works
								{provider === PROVIDERS.typesafe
									? '.'
									: ` - ${models.data?.length ?? 0} models available.`}
							</>
						)}
					</p>
					<div className="flex flex-wrap gap-2">
						<Button type="button" size="sm" variant="outline" onClick={() => void models.refetch()}>
							{models.isError ? 'Retry' : 'Test'}
						</Button>
						<Button
							type="button"
							size="sm"
							variant="ghost"
							aria-label={`Remove ${name} key`}
							onClick={() => removeKey(provider)}
						>
							Remove
						</Button>
					</div>
				</div>
			) : (
				<form
					className="flex flex-col gap-2"
					onSubmit={(event) => {
						event.preventDefault()
						save()
					}}
				>
					<Label htmlFor={inputId}>{name} key</Label>
					<div className="flex gap-2">
						<Input
							id={inputId}
							type="password"
							autoComplete="off"
							spellCheck={false}
							// Excluded from session replay and capture (R15).
							className="ph-no-capture"
							value={draft}
							onChange={(event) => setDraft(event.target.value)}
						/>
						<Button type="submit" disabled={!draft.trim()}>
							Save and test
						</Button>
					</div>
				</form>
			)}
			<a
				href={PROVIDER_KEY_PAGES[provider]}
				target="_blank"
				rel="noreferrer noopener"
				className="text-accent focus-visible:outline-accent inline-flex w-fit items-center gap-1 rounded text-sm underline underline-offset-4 focus-visible:outline focus-visible:outline-2"
			>
				{provider === PROVIDERS.typesafe ? 'TypeSafe docs' : `Manage or revoke at ${name}`}
				<ExternalLinkIcon size={14} />
			</a>
		</li>
	)
}
