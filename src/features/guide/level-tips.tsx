'use client'

import { GUIDE_PARTS, type GuidePart, type LevelStep } from '@/lib/constants'
import { tipForStep } from './guide'
import { GuideOverlay } from './guide-overlay'
import { useGuideSeen } from './use-guide-seen'
import { useGuideTarget } from './use-guide-target'

const LEVEL_TIP_PARTS: GuidePart[] = [GUIDE_PARTS.predict, GUIDE_PARTS.reveal, GUIDE_PARTS.check]

/**
 * A one-time tip on the level tabs that need one (ROADMAP Step-35). It waits
 * for its element: Reveal's "See every item" only exists once a race is shown,
 * so that tip appears then, and never on a level without it.
 */
export function LevelTips({ step, seen: serverSeen }: { step: LevelStep; seen: GuidePart[] }) {
	const { seen, markSeen } = useGuideSeen(serverSeen)
	const tip = tipForStep(step)
	const show = tip !== null && !seen.includes(tip.part)
	const target = useGuideTarget(tip?.targets.join(' ') ?? '', show, null)
	if (!tip || !show || target.status !== 'found') return null
	return (
		<GuideOverlay
			target={target}
			counter="Tip"
			title={tip.title}
			body={tip.body}
			primary={{ label: 'Got it', onSelect: () => markSeen([tip.part]) }}
			secondary={[{ label: 'Turn off tips', onSelect: () => markSeen(LEVEL_TIP_PARTS) }]}
			onDismiss={() => markSeen([tip.part])}
		/>
	)
}
