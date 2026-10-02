'use client'

import * as Dialog from '@radix-ui/react-dialog'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { CloseIcon, CopyIcon } from '@/components/ui/icons'
import { Input } from '@/components/ui/input'
import { ROUTES } from '@/lib/links'
import { toast } from '@/lib/toast'
import { useCreateShare, type ShareRequest } from './use-arena-mutations'

const OVERLAY = 'fixed inset-0 z-40 bg-black/50'
const CONTENT =
	'bg-surface border-border fixed top-1/2 left-1/2 z-50 flex w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 flex-col gap-3 rounded-lg border p-5'

/** Copies text, and says so, or says it could not (a locked-down browser can refuse). */
async function copyText(text: string): Promise<void> {
	try {
		await navigator.clipboard.writeText(text)
		toast({ title: 'Link copied' })
	} catch {
		toast({
			title: "Couldn't copy",
			description: 'Select the link and copy it yourself.',
			variant: 'destructive'
		})
	}
}

/**
 * "Share this result": a read-only snapshot under an unguessable link (R46).
 * A snapshot with the user's own text asks for consent to make it public first (R87).
 */
export function ShareControls({
	request,
	needsConsent
}: {
	request: ShareRequest | null
	needsConsent: boolean
}) {
	const [consentOpen, setConsentOpen] = useState(false)
	const [agreed, setAgreed] = useState(false)
	const [link, setLink] = useState<string | null>(null)
	const { create, pending } = useCreateShare((shareId) => {
		setConsentOpen(false)
		setLink(`${window.location.origin}${ROUTES.share(shareId)}`)
	})

	const start = () => {
		if (!request) return
		if (needsConsent) {
			setAgreed(false)
			setConsentOpen(true)
		} else {
			create({ request, consent: false })
		}
	}

	return (
		<>
			<Button type="button" variant="secondary" disabled={!request || pending} onClick={start}>
				Share this result
			</Button>

			<Dialog.Root open={consentOpen} onOpenChange={setConsentOpen}>
				<Dialog.Portal>
					<Dialog.Overlay className={OVERLAY} />
					<Dialog.Content className={CONTENT}>
						<Dialog.Title className="text-text text-lg font-bold">
							Make this result public?
						</Dialog.Title>
						<Dialog.Description className="text-text-muted text-sm">
							This result includes text you wrote. Anyone with the link can read it without signing
							in. You can delete the link later from this page.
						</Dialog.Description>
						<form
							className="flex flex-col gap-3"
							onSubmit={(event) => {
								event.preventDefault()
								if (request && agreed) create({ request, consent: true })
							}}
						>
							<label className="text-text flex items-start gap-2 text-sm">
								<input
									type="checkbox"
									className="mt-1 size-4"
									checked={agreed}
									onChange={(event) => setAgreed(event.target.checked)}
								/>
								<span>I understand this result and my text will be public.</span>
							</label>
							<div className="flex justify-end gap-2">
								<Button type="button" variant="outline" onClick={() => setConsentOpen(false)}>
									Cancel
								</Button>
								<Button type="submit" disabled={!agreed || pending}>
									Create link
								</Button>
							</div>
						</form>
					</Dialog.Content>
				</Dialog.Portal>
			</Dialog.Root>

			<Dialog.Root open={link !== null} onOpenChange={(open) => !open && setLink(null)}>
				<Dialog.Portal>
					<Dialog.Overlay className={OVERLAY} />
					<Dialog.Content className={CONTENT}>
						<div className="flex items-start justify-between gap-3">
							<Dialog.Title className="text-text text-lg font-bold">Link created</Dialog.Title>
							<Dialog.Close
								aria-label="Close"
								className="text-text hover:bg-surface-hover focus-visible:outline-accent rounded p-1 focus-visible:outline focus-visible:outline-2"
							>
								<CloseIcon />
							</Dialog.Close>
						</div>
						<Dialog.Description className="text-text-muted text-sm">
							Anyone with this link can see the result. It is read-only, and you can delete it from
							this page.
						</Dialog.Description>
						<form
							className="flex gap-2"
							onSubmit={(event) => {
								event.preventDefault()
								if (link) void copyText(link)
							}}
						>
							<Input
								readOnly
								aria-label="Share link"
								value={link ?? ''}
								onFocus={(event) => event.target.select()}
							/>
							<Button type="submit">
								<CopyIcon />
								Copy
							</Button>
						</form>
					</Dialog.Content>
				</Dialog.Portal>
			</Dialog.Root>
		</>
	)
}
