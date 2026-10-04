'use client'

import { useEffect, useRef, useState } from 'react'
import type { Task, TaskItem } from '@/content/task-schema'
import {
	RACE_LANES,
	RACE_STATUS,
	RACERS,
	type ProviderErrorKind,
	type RaceStatus
} from '@/lib/constants'
import type { LiveRace, RaceFailure } from '@/features/race/use-race'
import { ProviderError } from '@/runner/providers/provider-error'
import type { ItemResult, ItemRunner } from '@/runner/types'

// The two tools that make paid calls; Code runs in the browser for free.
const LIVE_TOOLS = [RACERS.jev, RACERS.llm] as const
export type LiveTool = (typeof LIVE_TOOLS)[number]

// Each card's live results, by task id, as the calls finish.
export type LiveCardResults = Record<string, Partial<Record<LiveTool, ItemResult>>>

// A finished run, whole: every card's results and when the run started.
export type LiveRouterFinish = { results: LiveCardResults; startedAt: string }

type Job = { task: Task; item: TaskItem; run: ItemRunner }

// Read in event handlers only; a named helper keeps the purity lint from reading start() as render code.
function currentTime(): number {
	return Date.now()
}

// Carries which tool's calls stopped the run, out of the lane that threw.
class RouterFailure extends Error {
	constructor(
		readonly kind: ProviderErrorKind,
		readonly racer: LiveTool
	) {
		super(`Live router run stopped: ${kind}`)
	}
}

/** Runs the jobs in order over `lanes` parallel lanes, until done or `signal` aborts. */
async function runLanes(
	jobs: Job[],
	signal: AbortSignal,
	work: (job: Job) => Promise<void>
): Promise<void> {
	let next = 0
	async function lane(): Promise<void> {
		while (!signal.aborted) {
			const job = jobs[next]
			if (!job) return
			next += 1
			await work(job)
		}
	}
	await Promise.all(Array.from({ length: Math.min(RACE_LANES, jobs.length) }, lane))
}

/**
 * Level 6 in Developer mode (R14): runs every card's first item live for Jev
 * and the LLM through the shared runner (R92), RACE_LANES calls at a time per
 * tool. `start` takes the runners with the keys already bound. A failure that
 * would repeat stops the run and keeps the results so far (R21, R82).
 */
export function useLiveRouter({
	tasks,
	onFinished
}: {
	tasks: Task[]
	onFinished?: (finish: LiveRouterFinish) => void
}) {
	const [status, setStatus] = useState<RaceStatus>(RACE_STATUS.idle)
	const [results, setResults] = useState<LiveCardResults>({})
	const [startedAt, setStartedAt] = useState<string | null>(null)
	const [failure, setFailure] = useState<RaceFailure | null>(null)
	// A stable box, so the unmount cleanup sees the run that is live then.
	const active = useRef<{ controller: AbortController | null }>({ controller: null })
	// The latest callback, so a finish sees the props of now, not those from when the run started.
	const latestOnFinished = useRef(onFinished)
	useEffect(() => {
		latestOnFinished.current = onFinished
	})
	const cards = tasks.filter((task) => task.items[0] !== undefined)
	const total = cards.length * LIVE_TOOLS.length

	useEffect(() => {
		const box = active.current
		return () => {
			box.controller?.abort()
			box.controller = null
		}
	}, [])

	function start(runnersFor: (task: Task) => LiveRace): void {
		if (active.current.controller) return
		const controller = new AbortController()
		// Aborts the sibling lanes when one tool's calls fail; the caller's controller is for unmount.
		const stop = new AbortController()
		controller.signal.addEventListener('abort', () => stop.abort(), { once: true })
		active.current.controller = controller
		setResults({})
		setFailure(null)
		setStatus(RACE_STATUS.running)
		const runStartedAt = new Date(currentTime()).toISOString()
		setStartedAt(runStartedAt)
		// The same results as the state, kept here too so the finish hands over all of them.
		let finished: LiveCardResults = {}
		const runners = new Map(cards.map((task) => [task.id, runnersFor(task)]))
		const lanes = LIVE_TOOLS.map((tool) => {
			const jobs = cards.flatMap((task) => {
				const item = task.items[0]
				const run = runners.get(task.id)?.[tool]
				return item && run ? [{ task, item, run }] : []
			})
			return runLanes(jobs, stop.signal, async ({ task, item, run }) => {
				let result: ItemResult
				try {
					result = await run(item, stop.signal)
				} catch (error) {
					stop.abort()
					throw error instanceof ProviderError ? new RouterFailure(error.kind, tool) : error
				}
				if (stop.signal.aborted) return
				const add = (current: LiveCardResults): LiveCardResults => ({
					...current,
					[task.id]: { ...current[task.id], [tool]: result }
				})
				finished = add(finished)
				setResults(add)
			})
		})
		void Promise.all(lanes)
			.then(
				() => true,
				(error: unknown) => {
					if (error instanceof RouterFailure) setFailure({ kind: error.kind, racer: error.racer })
					else if (!controller.signal.aborted) throw error
					return false
				}
			)
			.then((completed) => {
				if (controller.signal.aborted) return
				active.current.controller = null
				setStatus(RACE_STATUS.finished)
				// A stopped run is not a finish.
				if (completed) latestOnFinished.current?.({ results: finished, startedAt: runStartedAt })
			})
	}

	const done = Object.values(results).reduce((sum, card) => sum + Object.keys(card).length, 0)
	return { status, results, startedAt, failure, done, total, start }
}
export type LiveRouter = ReturnType<typeof useLiveRouter>
