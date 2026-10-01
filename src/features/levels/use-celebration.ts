'use client'

import { useEffect } from 'react'

const CONFETTI_PARTICLES = 120
const CONFETTI_SPREAD = 70

/** One burst of confetti when the view mounts with something to celebrate (R68). Skipped under reduced motion (R91). */
export function useCelebration(celebrate: boolean): void {
	useEffect(() => {
		if (!celebrate) return
		let cancelled = false
		void import('canvas-confetti').then(({ default: confetti }) => {
			if (cancelled) return
			void confetti({
				particleCount: CONFETTI_PARTICLES,
				spread: CONFETTI_SPREAD,
				disableForReducedMotion: true
			})
		})
		return () => {
			cancelled = true
		}
	}, [celebrate])
}
