'use client'

import { Button } from '@/components/ui/button'
import { SignOutIcon } from '@/components/ui/icons'

type SignOutButtonProps = { pending: boolean; onSignOut: () => void; className?: string }

export function SignOutButton({ pending, onSignOut, className }: SignOutButtonProps) {
	return (
		<Button
			type="button"
			variant="ghost"
			size="sm"
			disabled={pending}
			onClick={onSignOut}
			className={className}
		>
			<SignOutIcon />
			Sign out
		</Button>
	)
}
