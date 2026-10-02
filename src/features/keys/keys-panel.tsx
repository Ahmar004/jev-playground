'use client'

import * as Dialog from '@radix-ui/react-dialog'
import { Button } from '@/components/ui/button'
import { CloseIcon } from '@/components/ui/icons'
import { PROVIDERS } from '@/lib/constants'
import { KeyRow } from './key-row'
import { useKeys } from './keys-context'

// The Jev key first, then the LLM providers.
const PANEL_PROVIDERS = [
	PROVIDERS.typesafe,
	PROVIDERS.anthropic,
	PROVIDERS.openai,
	PROVIDERS.google,
	PROVIDERS.openrouter
] as const

/** The Keys side sheet (spec 4): one row per provider, and one click to remove every key (R20). */
export function KeysPanel() {
	const { keys, panelOpen, setPanelOpen, removeAll } = useKeys()
	return (
		<Dialog.Root open={panelOpen} onOpenChange={setPanelOpen}>
			<Dialog.Portal>
				<Dialog.Overlay className="data-[state=closed]:animate-fade-out data-[state=open]:animate-fade-in fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" />
				<Dialog.Content className="bg-surface border-border shadow-card-hover data-[state=closed]:animate-slide-out-right data-[state=open]:animate-slide-in-right fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col gap-2 overflow-y-auto border-l p-5">
					<div className="flex items-start justify-between gap-3">
						<Dialog.Title className="text-text text-xl font-bold">Your API keys</Dialog.Title>
						<Dialog.Close
							aria-label="Close"
							className="text-text hover:bg-surface-hover focus-visible:outline-accent rounded p-1 focus-visible:outline focus-visible:outline-2"
						>
							<CloseIcon />
						</Dialog.Close>
					</div>
					<Dialog.Description className="text-text-muted text-sm">
						Developer mode runs live, with your own keys. A key lives only in this tab&apos;s
						memory: it is never saved, and reloading or closing the tab removes it.
					</Dialog.Description>
					<ul>
						{PANEL_PROVIDERS.map((provider) => (
							<KeyRow key={provider} provider={provider} />
						))}
					</ul>
					<div>
						<Button
							type="button"
							variant="outline"
							disabled={Object.keys(keys).length === 0}
							onClick={removeAll}
						>
							Remove all keys
						</Button>
					</div>
				</Dialog.Content>
			</Dialog.Portal>
		</Dialog.Root>
	)
}
