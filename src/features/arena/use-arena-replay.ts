'use client'

import { useEffect, useRef, useState } from 'react'
import type { Racer } from '@/lib/constants'
import type { ArenaSide } from './snapshot'

export type ReplayStatus = 'idle' | 'running' | 'done'

/**
 * Replays a recorded pair: each side appears after its own recorded latency,
 * so the speed difference is felt, not just read (CLAUDE.md > Product guardrails).
 * Remount with a new `key` to switch opponent: unmounting clears the timers.
 */
export function useArenaReplay(sides: ArenaSide[], onDone: () => void) {
	const [status, setStatus] = useState<ReplayStatus>('idle')
	const [shown, setShown] = useState<Racer[]>([])
	const timers = useRef<number[]>([])

	const clear = () => {
		for (const id of timers.current) window.clearTimeout(id)
		timers.current = []
	}
	useEffect(() => clear, [])

	const run = () => {
		clear()
		setShown([])
		setStatus('running')
		const last = Math.max(...sides.map((side) => side.result.latencyMs))
		for (const side of sides) {
			timers.current.push(
				window.setTimeout(
					() => setShown((current) => [...current, side.racer]),
					side.result.latencyMs
				)
			)
		}
		timers.current.push(
			window.setTimeout(() => {
				setStatus('done')
				onDone()
			}, last)
		)
	}

	return { status, shown, run }
}
