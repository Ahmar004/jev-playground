'use client'

import { useEffect } from 'react'

const CONFETTI_PARTICLES = 120
const CONFETTI_SPREAD = 70

// Kept outside the hook: React Compiler cannot lower import() inside a component or hook.
async function burstConfetti(isCancelled: () => boolean): Promise<void> {
	const { default: confetti } = await import('canvas-confetti')
	if (isCancelled()) return
	void confetti({
		particleCount: CONFETTI_PARTICLES,
		spread: CONFETTI_SPREAD,
		disableForReducedMotion: true
	})
}

/** One burst of confetti when the view mounts with something to celebrate (R68). Skipped under reduced motion (R91). */
export function useCelebration(celebrate: boolean): void {
	useEffect(() => {
		if (!celebrate) return
		let cancelled = false
		void burstConfetti(() => cancelled)
		return () => {
			cancelled = true
		}
	}, [celebrate])
}
