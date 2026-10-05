'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { trackFlowStep } from '@/lib/analytics/track'
import { GUIDE_PART_LIST, GUIDE_PARTS, type GuidePart } from '@/lib/constants'
import { toast } from '@/lib/toast'
import { WELCOME_TOUR } from './guide'
import { useGuideSeen } from './use-guide-seen'

const FLOW_NAME = 'welcome_tour'

/**
 * The welcome tour's state. It opens by itself for a user who hasn't seen it,
 * and from "Take a guide tour" any time. Skipping turns the level tips off as
 * well (the user opted out of guidance); finishing keeps them on.
 */
export function useWelcomeTour(serverSeen: GuidePart[], startHref: string) {
	const router = useRouter()
	const { markSeen } = useGuideSeen(serverSeen)
	const [index, setIndex] = useState<number | null>(() =>
		serverSeen.includes(GUIDE_PARTS.welcome) ? null : 0
	)
	const stepId = index === null ? null : (WELCOME_TOUR[index]?.id ?? null)

	// One event per step shown, so a PostHog funnel shows where people leave the tour.
	useEffect(() => {
		if (stepId) trackFlowStep({ flow_name: FLOW_NAME, step_name: stepId })
	}, [stepId])

	const finish = () => {
		setIndex(null)
		markSeen([GUIDE_PARTS.welcome])
		trackFlowStep({ flow_name: FLOW_NAME, step_name: 'finished' })
	}

	return {
		index,
		isLast: index === WELCOME_TOUR.length - 1,
		start: () => setIndex(0),
		next: () =>
			setIndex((current) =>
				current === null ? null : Math.min(current + 1, WELCOME_TOUR.length - 1)
			),
		back: () => setIndex((current) => (current === null ? null : Math.max(current - 1, 0))),
		finish,
		skip: () => {
			setIndex(null)
			markSeen([...GUIDE_PART_LIST])
			trackFlowStep({ flow_name: FLOW_NAME, step_name: 'skipped' })
			toast({
				title: 'Tour skipped',
				description: 'Level tips are off too. Replay both any time from your account menu.'
			})
		},
		playFirstLevel: () => {
			finish()
			router.push(startHref)
		}
	}
}
