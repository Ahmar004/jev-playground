'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { LEVEL_STEP_ORDER, LEVEL_STEPS, type LevelStep } from '@/lib/constants'

const STEP_PARAM = 'step'

function isLevelStep(value: string | null): value is LevelStep {
	return LEVEL_STEP_ORDER.some((step) => step === value)
}

export function parseStep(value: string | null): LevelStep {
	return isLevelStep(value) ? value : LEVEL_STEPS.learn
}

/** The current level step lives in ?step= so it survives reloads and the back button (DESIGN 6). */
export function useLevelStep(): { step: LevelStep; goTo: (step: LevelStep) => void } {
	const searchParams = useSearchParams()
	const router = useRouter()
	const pathname = usePathname()
	return {
		step: parseStep(searchParams.get(STEP_PARAM)),
		goTo: (step) => router.push(`${pathname}?${STEP_PARAM}=${step}`)
	}
}
