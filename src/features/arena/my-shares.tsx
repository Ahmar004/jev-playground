'use client'

import * as Dialog from '@radix-ui/react-dialog'
import Link from 'next/link'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { TrashIcon } from '@/components/ui/icons'
import { recordedOn } from '@/features/race/format'
import { MODES } from '@/lib/constants'
import { ROUTES } from '@/lib/links'
import type { MyShare } from '@/server/data/shares'
import { useDeleteShare } from './use-arena-mutations'

/** The user's own shares, each with its link and a Delete that kills the link at once (R87). */
export function MyShares({ shares }: { shares: MyShare[] }) {
	// Hidden at once on delete; the refreshed server list then agrees.
	const [deleted, setDeleted] = useState<string[]>([])
	const [pending, setPending] = useState<MyShare | null>(null)
	const { remove, pending: deleting } = useDeleteShare((shareId) => {
		setDeleted((current) => [...current, shareId])
		setPending(null)
	})
	const visible = shares.filter((share) => !deleted.includes(share.id))
	return (
		<section aria-labelledby="my-shares-heading" className="flex flex-col gap-3">
			<h2 id="my-shares-heading" className="text-text text-xl font-bold">
				Your shared results
			</h2>
			{visible.length === 0 ? (
				<p className="text-text-muted">
					You have not shared anything yet. Run a preset, then choose Share this result.
				</p>
			) : (
				<ul className="flex flex-col gap-2">
					{visible.map((share) => (
						<li key={share.id}>
							<Card className="flex flex-wrap items-center justify-between gap-3 p-3">
								<div className="min-w-0">
									<Link
										href={ROUTES.share(share.id)}
										className="text-accent font-medium wrap-anywhere underline"
									>
										{share.title}
									</Link>
									<p className="text-text-muted text-xs">
										{share.mode === MODES.developer ? 'Developer mode' : 'Beginner mode'} - shared{' '}
										{recordedOn(share.createdAt)}
									</p>
								</div>
								<Button
									type="button"
									variant="outline"
									size="sm"
									aria-label={`Delete the shared result ${share.title}`}
									onClick={() => setPending(share)}
								>
									<TrashIcon />
									Delete
								</Button>
							</Card>
						</li>
					))}
				</ul>
			)}

			<Dialog.Root open={pending !== null} onOpenChange={(open) => !open && setPending(null)}>
				<Dialog.Portal>
					<Dialog.Overlay className="fixed inset-0 z-40 bg-black/50" />
					<Dialog.Content className="bg-surface border-border fixed top-1/2 left-1/2 z-50 flex w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 flex-col gap-3 rounded-lg border p-5">
						<Dialog.Title className="text-text text-lg font-bold">Delete this share?</Dialog.Title>
						<Dialog.Description className="text-text-muted text-sm">
							The link stops working at once for everyone who has it. This cannot be undone.
						</Dialog.Description>
						<form
							className="flex justify-end gap-2"
							onSubmit={(event) => {
								event.preventDefault()
								if (pending) remove(pending.id)
							}}
						>
							<Button type="button" variant="outline" onClick={() => setPending(null)}>
								Cancel
							</Button>
							<Button type="submit" disabled={deleting}>
								Delete share
							</Button>
						</form>
					</Dialog.Content>
				</Dialog.Portal>
			</Dialog.Root>
		</section>
	)
}
