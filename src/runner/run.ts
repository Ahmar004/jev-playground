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
	// Internal signal: aborts when the caller aborts or when any lane fails, so
	// sibling lanes stop making paid calls and emitting events.
	const internal = new AbortController()
	const signal = internal.signal
	const callerSignal = options.signal
	const onCallerAbort = () => internal.abort()
	if (callerSignal?.aborted) internal.abort()
	else callerSignal?.addEventListener('abort', onCallerAbort, { once: true })
	const origin = now()
	const elapsed = () => now() - origin
	const results: (ItemResult | undefined)[] = []
	let next = 0
	let firstStart: number | null = null
	let lastEnd = 0

	async function lane(laneIndex: number): Promise<void> {
		while (!signal.aborted) {
			const index = next
			const item = task.items[index]
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
			results[index] = result
			onEvent({ type: RUN_EVENTS.itemFinished, racer, lane: laneIndex, atMs: finishedAt, result })
		}
	}

	const laneCount = Math.max(1, Math.min(lanes, task.items.length))
	try {
		await Promise.all(
			Array.from({ length: laneCount }, (_, laneIndex) =>
				lane(laneIndex).catch((error: unknown) => {
					internal.abort()
					throw error
				})
			)
		)
	} catch (error) {
		if (callerSignal?.aborted) return null
		throw error
	} finally {
		callerSignal?.removeEventListener('abort', onCallerAbort)
	}
	if (signal.aborted) return null

	const totals = computeTotals(
		results.filter((result): result is ItemResult => result !== undefined),
		lastEnd - (firstStart ?? 0)
	)
	onEvent({ type: RUN_EVENTS.runFinished, racer, atMs: lastEnd, totals })
	return totals
}
