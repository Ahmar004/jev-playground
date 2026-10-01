'use client'

import { useEffect, useRef } from 'react'
import type { LevelStep } from '@/lib/constants'

/**
 * Moves focus to the new step's heading when the step changes, so keyboard and
 * screen reader users land on the new content instead of the page body. It skips
 * the first render, and does nothing when the step has no heading (not recorded).
 */
export function useStepFocus(step: LevelStep): void {
	const previous = useRef(step)
	useEffect(() => {
		if (previous.current === step) return
		previous.current = step
		document.getElementById(`${step}-heading`)?.focus()
	}, [step])
}
