'use client'

import { unstable_isUnrecognizedActionError } from 'next/navigation'
import { toast } from '@/lib/toast'

// Vercel Hobby has no Skew Protection: a tab opened before a deploy keeps the
// old Server Action ids, and the new deploy doesn't know them, so every action
// from that tab fails until it reloads. Navigations already reload on their
// own (Next sees the new build); a failed action needs the user to reload.

export const STALE_DEPLOY_NOTICE = {
	key: 'stale-deploy',
	title: 'The site was just updated',
	description: 'Reload to continue.'
} as const

/** True when a Server Action failed because the site was redeployed since the tab opened. */
export function isStaleDeployError(error: unknown): boolean {
	return unstable_isUnrecognizedActionError(error)
}

/** One notice that stays up with a Reload button, however many actions fail. */
export function showStaleDeployNotice(): void {
	toast({
		...STALE_DEPLOY_NOTICE,
		persistent: true,
		action: { label: 'Reload', onClick: () => window.location.reload() }
	})
}

/** Shows the notice for a stale deploy error and says whether it did. */
export function handleStaleDeploy(error: unknown): boolean {
	if (!isStaleDeployError(error)) return false
	showStaleDeployNotice()
	return true
}
