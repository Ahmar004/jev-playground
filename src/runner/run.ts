import type { Task } from '@/content/task-schema'
import { RACE_LANES, RUN_EVENTS, type Racer } from '@/lib/constants'
import { computeTotals } from './totals'
import type { ItemResult, ItemRunner, RunEvent, RunTotals } from './types'

export type RunOptions = {
	lanes?: number
	signal?: AbortSignal
	onEvent: (event: RunEvent) => void
	// Injected in tests; performance.now() otherwise.
	now?: () => number
}

/**
 * Runs a task's items in order over parallel lanes (RACE_LANES for every
 * racer), emitting RunEvents as calls start and finish. Resolves with the
 * totals, or null when aborted, in which case no run_finished is emitted.
 */
export async function runItems(
	task: Task,
	racer: Racer,
	runItem: ItemRunner,
	options: RunOptions
): Promise<RunTotals | null> {
	const { lanes = RACE_LANES, onEvent, now = () => performance.now() } = options
	const signal = options.signal ?? new AbortController().signal
	const origin = now()
	const elapsed = () => now() - origin
	const results: ItemResult[] = []
	let next = 0
	let firstStart: number | null = null
	let lastEnd = 0

	async function lane(laneIndex: number): Promise<void> {
		while (!signal.aborted) {
			const item = task.items[next]
			if (!item) return
			next += 1
			const startedAt = elapsed()
			firstStart ??= startedAt
			onEvent({
				type: RUN_EVENTS.itemStarted,
				racer,
				itemId: item.id,
				lane: laneIndex,
				atMs: startedAt
			})
			const result = await runItem(item, signal)
			if (signal.aborted) return
			const finishedAt = elapsed()
			lastEnd = Math.max(lastEnd, finishedAt)
			results.push(result)
			onEvent({ type: RUN_EVENTS.itemFinished, racer, lane: laneIndex, atMs: finishedAt, result })
		}
	}

	const laneCount = Math.min(lanes, task.items.length)
	try {
		await Promise.all(Array.from({ length: laneCount }, (_, laneIndex) => lane(laneIndex)))
	} catch (error) {
		if (signal.aborted) return null
		throw error
	}
	if (signal.aborted) return null

	const totals = computeTotals(results, lastEnd - (firstStart ?? 0))
	onEvent({ type: RUN_EVENTS.runFinished, racer, atMs: lastEnd, totals })
	return totals
}
