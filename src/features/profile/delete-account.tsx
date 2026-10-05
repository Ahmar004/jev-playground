'use client'

import * as Dialog from '@radix-ui/react-dialog'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { TrashIcon } from '@/components/ui/icons'
import { useDeleteAccount } from './use-delete-account'

/** "Delete my account" on Profile (ROADMAP Step-21): a confirm dialog, then everything of the user's is removed. */
export function DeleteAccount() {
	const [open, setOpen] = useState(false)
	const { remove, pending } = useDeleteAccount()
	return (
		<section aria-labelledby="delete-account-heading" className="flex flex-col gap-2">
			<h2 id="delete-account-heading" className="text-text text-xl font-bold">
				Delete your account
			</h2>
			<p className="text-text-muted">
				Removes your sign-in, progress, quiz answers, XP, badges, leaderboard entries and shared
				results. This cannot be undone.
			</p>
			<div>
				<Button type="button" variant="outline" onClick={() => setOpen(true)}>
					<TrashIcon />
					Delete my account
				</Button>
			</div>

			<Dialog.Root open={open} onOpenChange={setOpen}>
				<Dialog.Portal>
					<Dialog.Overlay className="data-[state=closed]:animate-fade-out data-[state=open]:animate-fade-in fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" />
					<Dialog.Content className="bg-surface border-border shadow-card-hover data-[state=closed]:animate-pop-out data-[state=open]:animate-pop-in fixed top-1/2 left-1/2 z-50 flex w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 flex-col gap-3 rounded-lg border p-5">
						<Dialog.Title className="text-text text-lg font-bold">
							Delete your account?
						</Dialog.Title>
						<Dialog.Description className="text-text-muted text-sm">
							Your progress, quiz answers, XP, badges, leaderboard entries and shared results are
							deleted, along with your sign-in, and you are signed out. Shared links stop working.
							This cannot be undone.
						</Dialog.Description>
						<form
							className="flex justify-end gap-2"
							onSubmit={(event) => {
								event.preventDefault()
								remove()
							}}
						>
							<Button type="button" variant="outline" onClick={() => setOpen(false)}>
								Cancel
							</Button>
							<Button type="submit" variant="destructive" disabled={pending}>
								{pending ? 'Deleting...' : 'Yes, delete everything'}
							</Button>
						</form>
					</Dialog.Content>
				</Dialog.Portal>
			</Dialog.Root>
		</section>
	)
}
