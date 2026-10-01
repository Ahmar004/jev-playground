import type { Recording } from '@/content/recording-schema'
import { RUN_EVENTS } from '@/lib/constants'
import type { RunEvent } from './types'

export type ScheduledEvent = { atMs: number; event: RunEvent }

/** The recorded events in time order, ending with the recorded totals. */
export function replaySchedule(recording: Recording): ScheduledEvent[] {
	const { racer } = recording
	const entries: ScheduledEvent[] = []
	for (const { lane, startMs, endMs, ...result } of recording.events) {
		entries.push({
			atMs: startMs,
			event: { type: RUN_EVENTS.itemStarted, racer, itemId: result.itemId, lane, atMs: startMs }
		})
		entries.push({
			atMs: endMs,
			event: { type: RUN_EVENTS.itemFinished, racer, lane, atMs: endMs, result }
		})
	}
	// Stable sort: an item's start stays ahead of its own finish.
	entries.sort((a, b) => a.atMs - b.atMs)
	const endAt = entries.reduce((latest, entry) => Math.max(latest, entry.atMs), 0)
	entries.push({
		atMs: endAt,
		event: { type: RUN_EVENTS.runFinished, racer, atMs: endAt, totals: recording.totals }
	})
	return entries
}

export type ReplayOptions = { onEvent: (event: RunEvent) => void; signal?: AbortSignal }
export type ReplayHandle = { skip: () => void; done: Promise<void> }

/**
 * Plays a Recording as RunEvents at their recorded offsets, so replays run at
 * real speed (R7). skip() emits every remaining event at once (DESIGN 3.2).
 * done resolves when the last event fires, after skip, or on abort.
 */
export function replaySource(
	recording: Recording,
	{ onEvent, signal }: ReplayOptions
): ReplayHandle {
	const schedule = replaySchedule(recording)
	const timers: ReturnType<typeof setTimeout>[] = []
	let emitted = 0
	let resolveDone: () => void = () => undefined
	const done = new Promise<void>((resolve) => {
		resolveDone = resolve
	})

	function stop(): void {
		for (const timer of timers) clearTimeout(timer)
		timers.length = 0
		resolveDone()
	}

	function emitThrough(index: number): void {
		while (emitted <= index && emitted < schedule.length) {
			const entry = schedule[emitted]
			emitted += 1
			if (entry) onEvent(entry.event)
		}
		if (emitted >= schedule.length) stop()
	}

	if (signal?.aborted) {
		stop()
		return { skip: () => undefined, done }
	}
	signal?.addEventListener('abort', stop, { once: true })
	schedule.forEach((entry, index) => {
		timers.push(setTimeout(() => emitThrough(index), entry.atMs))
	})

	return {
		skip: () => {
			if (!signal?.aborted) emitThrough(schedule.length - 1)
		},
		done
	}
}
