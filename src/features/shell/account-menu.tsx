'use client'

import { SignOutButton } from './sign-out-button'
import { useSignOut } from './use-sign-out'

// The signed-in email (plain text, R86) and sign out. Profile replaces this in
// slice 12 with the full account page.
export function AccountMenu({ email }: { email: string }) {
	const { pending, signOut } = useSignOut()

	return (
		<div className="flex items-center gap-2">
			<span className="text-text-muted hidden max-w-48 truncate text-sm sm:inline" title={email}>
				{email}
			</span>
			<SignOutButton pending={pending} onSignOut={signOut} />
		</div>
	)
}
