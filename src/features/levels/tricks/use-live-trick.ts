'use client'

import { useEffect, useRef, useState } from 'react'
import type { TaskItem } from '@/content/task-schema'
import { RACERS } from '@/lib/constants'
import type { RaceFailure } from '@/features/race/use-race'
import { ProviderError } from '@/runner/providers/provider-error'
import type { ItemResult, ItemRunner } from '@/runner/types'

// Long enough for any customer message; keeps one attempt far under /api/jev's body cap.
export const TRICK_TEXT_MAX = 2000

/** The user's own trick: the message, and whether the sender really is asking the question's "yes". */
export type TrickInput = { text: string; label: boolean }

// One reply from Jev to the user's trick.
export type TrickRun = TrickInput & { id: string; ranAt: string; result: ItemResult }

// A reply with the model that gave it, for its Developer mode label.
export type TrickAttempt = TrickRun & { modelId: string }

// Read in event handlers only; a named helper keeps the purity lint from reading ask() as render code.
function currentTime(): number {
	return Date.now()
}

/**
 * Level 8 in Developer mode (R14): sends the user's own trick text to Jev,
 * one call per attempt, through the runner the caller binds (R92). Every
 * reply goes to `onAttempt`, a reply that did not parse included (R44); the
 * caller keeps them, so they outlive Play. A failure that would repeat (a bad
 * key, a rate limit) stops with `failure` instead.
 */
export function useLiveTrick({ onAttempt }: { onAttempt: (run: TrickRun) => void }) {
	const [pending, setPending] = useState(false)
	const [failure, setFailure] = useState<RaceFailure | null>(null)
	// The latest input sent, so Retry after a failure resends exactly that.
	const [lastInput, setLastInput] = useState<TrickInput | null>(null)
	// A stable box, so the unmount cleanup sees the call that is live then.
	const active = useRef<{ controller: AbortController | null; count: number }>({
		controller: null,
		count: 0
	})

	useEffect(() => {
		const box = active.current
		return () => {
			box.controller?.abort()
			box.controller = null
		}
	}, [])

	function ask(input: TrickInput, run: ItemRunner): void {
		const text = input.text.trim()
		if (!text || text.length > TRICK_TEXT_MAX || active.current.controller) return
		const controller = new AbortController()
		active.current.controller = controller
		active.current.count += 1
		const item: TaskItem = { id: `yours-${active.current.count}`, state: text, label: input.label }
		const ranAt = new Date(currentTime()).toISOString()
		setFailure(null)
		setLastInput({ text, label: input.label })
		setPending(true)
		void run(item, controller.signal)
			.then(
				(result) => {
					if (controller.signal.aborted) return
					// The count restarts when Play remounts, so the run time keeps kept attempts' ids apart.
					onAttempt({ id: `${item.id}-${ranAt}`, text, label: input.label, ranAt, result })
				},
				(error: unknown) => {
					if (controller.signal.aborted) return
					if (!(error instanceof ProviderError)) throw error
					setFailure({ kind: error.kind, racer: RACERS.jev })
				}
			)
			.finally(() => {
				if (controller.signal.aborted) return
				active.current.controller = null
				setPending(false)
			})
	}

	return { pending, failure, lastInput, ask }
}
export type LiveTrick = ReturnType<typeof useLiveTrick>
