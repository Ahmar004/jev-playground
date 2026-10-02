'use client'

import { Button } from '@/components/ui/button'
import { InfoIcon } from '@/components/ui/icons'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/cn'
import { LLM_PROVIDERS, PROVIDER_LABELS, type LlmProvider } from '@/lib/constants'
import { useKeys } from '@/features/keys/keys-context'
import type { LiveSetup } from './use-live-config'

const SELECT = cn(
	'border-border bg-surface text-text h-9 w-full rounded border px-3 text-sm',
	'focus-visible:outline-accent focus-visible:outline focus-visible:outline-2'
)

function isLlmProvider(value: string): value is LlmProvider {
	return (LLM_PROVIDERS as readonly string[]).includes(value)
}

/** Developer mode's opponent: pick the LLM from the models the user's own key can reach (R10, R42). */
export function LiveSetupPanel({ setup }: { setup: LiveSetup }) {
	const { setPanelOpen } = useKeys()
	return (
		<div className="bg-surface border-border shadow-card flex flex-col gap-3 rounded-lg border p-4">
			{setup.providers.length > 0 && (
				<div className="grid gap-3 sm:grid-cols-2">
					<div className="flex flex-col gap-1">
						<Label htmlFor="live-provider">LLM provider</Label>
						<select
							id="live-provider"
							className={SELECT}
							value={setup.provider ?? ''}
							onChange={(event) => {
								if (isLlmProvider(event.target.value)) setup.setProvider(event.target.value)
							}}
						>
							{setup.providers.map((provider) => (
								<option key={provider} value={provider}>
									{PROVIDER_LABELS[provider]}
								</option>
							))}
						</select>
					</div>
					<div className="flex flex-col gap-1">
						<Label htmlFor="live-model">Model</Label>
						<select
							id="live-model"
							className={SELECT}
							value={setup.modelId ?? ''}
							disabled={setup.models.length === 0}
							onChange={(event) => setup.setModelId(event.target.value)}
						>
							{setup.models.map((model) => (
								<option key={model.id} value={model.id}>
									{model.label}
								</option>
							))}
						</select>
					</div>
				</div>
			)}
			{setup.missing && (
				<div className="flex flex-wrap items-center gap-3">
					<p className="text-text flex items-center gap-2 text-sm">
						<InfoIcon className="shrink-0" />
						{setup.missing}
					</p>
					<Button type="button" size="sm" variant="outline" onClick={() => setPanelOpen(true)}>
						Open Keys
					</Button>
				</div>
			)}
		</div>
	)
}
