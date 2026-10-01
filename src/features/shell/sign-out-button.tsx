'use client'

import { Button } from '@/components/ui/button'
import { SignOutIcon } from '@/components/ui/icons'

type SignOutButtonProps = { pending: boolean; onSignOut: () => void }

export function SignOutButton({ pending, onSignOut }: SignOutButtonProps) {
	return (
		<Button type="button" variant="ghost" size="sm" disabled={pending} onClick={onSignOut}>
			<SignOutIcon />
			Sign out
		</Button>
	)
}
