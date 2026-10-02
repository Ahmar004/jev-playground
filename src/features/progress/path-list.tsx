'use client'

import type { LevelStatus } from '@/lib/constants'
import { PathView, type PathLevel } from './path-view'
import { useSkipLevel } from './use-skip-level'

/** Client wrapper that owns the skip mutation for the Path page. */
export function PathList({
	levels,
	initialStatuses
}: {
	levels: PathLevel[]
	initialStatuses: Record<string, LevelStatus>
}) {
	const { statuses, skip, pendingLevelId } = useSkipLevel(initialStatuses)
	return (
		<PathView levels={levels} statuses={statuses} pendingLevelId={pendingLevelId} onSkip={skip} />
	)
}
