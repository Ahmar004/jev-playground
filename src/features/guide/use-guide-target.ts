'use client'

import { useEffect, useState } from 'react'
import type { Rect, Viewport } from './guide'

export type GuideTarget =
	| { status: 'searching' }
	| { status: 'found'; rect: Rect; viewport: Viewport }
	| { status: 'missing'; viewport: Viewport }

function isShown(element: Element): boolean {
	const box = element.getBoundingClientRect()
	return box.width > 0 || box.height > 0
}

function findShown(targets: readonly string[]): Element | null {
	for (const target of targets) {
		for (const element of document.querySelectorAll(`[data-guide="${target}"]`)) {
			if (isShown(element)) return element
		}
	}
	return null
}

function bringIntoView(element: Element, reducedMotion: boolean) {
	const box = element.getBoundingClientRect()
	if (box.top >= 0 && box.bottom <= window.innerHeight) return
	element.scrollIntoView({ block: 'center', behavior: reducedMotion ? 'auto' : 'smooth' })
}

/**
 * Finds the first shown element among `data-guide` targets (space-separated in
 * `targetKey`, so the dependency stays a string) and tracks its box through
 * scrolling, resizing and re-renders. A section still streaming in is waited
 * for: up to `waitMs`, then the step falls back to `missing` (a centered
 * pop-up); with `waitMs` null it waits for as long as the step is active.
 */
export function useGuideTarget(
	targetKey: string,
	active: boolean,
	waitMs: number | null
): GuideTarget {
	const [target, setTarget] = useState<GuideTarget>({ status: 'searching' })

	useEffect(() => {
		if (!active) return
		const targets = targetKey ? targetKey.split(' ') : []
		const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
		let element: Element | null = null
		let gaveUp = targets.length === 0
		let frame = 0

		const resizes = new ResizeObserver(() => schedule())
		const measure = () => {
			frame = 0
			if (!element?.isConnected || !isShown(element)) {
				element = findShown(targets)
				resizes.disconnect()
				if (element) {
					resizes.observe(element)
					bringIntoView(element, reducedMotion)
				}
			}
			const viewport = { width: window.innerWidth, height: window.innerHeight }
			if (element) {
				const { top, left, width, height } = element.getBoundingClientRect()
				setTarget({ status: 'found', rect: { top, left, width, height }, viewport })
			} else {
				setTarget(gaveUp ? { status: 'missing', viewport } : { status: 'searching' })
			}
		}
		function schedule() {
			if (!frame) frame = requestAnimationFrame(measure)
		}

		const mutations = new MutationObserver(schedule)
		mutations.observe(document.body, { childList: true, subtree: true })
		window.addEventListener('scroll', schedule, { capture: true, passive: true })
		window.addEventListener('resize', schedule)
		const timer =
			waitMs === null || gaveUp
				? undefined
				: window.setTimeout(() => {
						gaveUp = true
						schedule()
					}, waitMs)
		schedule()

		return () => {
			cancelAnimationFrame(frame)
			mutations.disconnect()
			resizes.disconnect()
			window.removeEventListener('scroll', schedule, { capture: true })
			window.removeEventListener('resize', schedule)
			window.clearTimeout(timer)
		}
	}, [active, targetKey, waitMs])

	return target
}
