'use client'

import Link from 'next/link'
import { AvatarIcon, GuideIcon, UserIcon } from '@/components/ui/icons'
import { Popover, PopoverClose, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { GUIDE_TARGETS } from '@/features/guide/guide'
import { useReplayGuide } from '@/features/guide/use-guide-seen'
import { ROUTES } from '@/lib/links'
import { SignOutButton } from './sign-out-button'
import { useSignOut } from './use-sign-out'

/** The profile button: opens the signed-in email (plain text, R86), a Profile link, the guide tour and sign out. */
export function AccountMenu({ email }: { email: string }) {
	const { pending, signOut } = useSignOut()
	const guide = useReplayGuide()

	return (
		<Popover>
			<PopoverTrigger
				aria-label="Account menu"
				data-guide={GUIDE_TARGETS.accountMenu}
				className="focus-visible:outline-accent bg-border rounded-full p-0.5 transition-transform duration-200 hover:scale-105 focus-visible:outline focus-visible:outline-2 active:scale-95"
			>
				<span className="bg-surface text-text flex size-8 items-center justify-center rounded-full">
					<AvatarIcon size={22} />
				</span>
			</PopoverTrigger>
			<PopoverContent align="end" className="flex w-64 flex-col gap-2">
				<div className="flex flex-col gap-0.5 px-1">
					<span className="text-text-muted text-xs font-semibold tracking-wide uppercase">
						Signed in as
					</span>
					<span className="text-text truncate text-sm font-semibold" title={email}>
						{email}
					</span>
				</div>
				<div className="border-border border-t" />
				<PopoverClose asChild>
					<Link
						href={ROUTES.profile}
						className="text-text hover:bg-surface-hover focus-visible:outline-accent flex items-center gap-2 rounded px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2"
					>
						<UserIcon />
						Your profile
					</Link>
				</PopoverClose>
				<PopoverClose asChild>
					<button
						type="button"
						disabled={guide.pending}
						onClick={guide.replay}
						className="text-text hover:bg-surface-hover focus-visible:outline-accent flex items-center gap-2 rounded px-3 py-1.5 text-left text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 disabled:opacity-60"
					>
						<GuideIcon />
						Take the tour
					</button>
				</PopoverClose>
				<SignOutButton
					pending={pending}
					onSignOut={signOut}
					className="text-danger justify-start"
				/>
			</PopoverContent>
		</Popover>
	)
}
