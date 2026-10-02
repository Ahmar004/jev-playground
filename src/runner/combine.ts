import { z } from 'zod'
import type { Recording } from '@/content/recording-schema'
import type { Task, TaskItem } from '@/content/task-schema'
import { RACERS, RUN_EVENTS, type Racer } from '@/lib/constants'
import { COMBINE_FNS, type CombineArgs } from './code/combine-fns'
import { jevAnswerSchema } from './parse'
import { missCredit, scoreAnswer, toCorrect } from './score'
import { computeTotals } from './totals'
import type { ItemResult, RunEvent } from './types'

const jevAnswersSchema = z.record(z.string(), jevAnswerSchema)

/**
 * Jev + Code for one item: the task's combine function applied to Jev's
 * parsed answers (DESIGN 3.2). Latency is Jev's plus the function's time;
 * cost is Jev's. Recordings store only Jev's results, so both modes derive
 * this the same way.
 */
export function combineResult(
	task: Task,
	item: TaskItem,
	jevResult: ItemResult,
	args?: CombineArgs
): ItemResult {
	if (!task.combine) throw new Error(`${task.id} has no combine function`)
	const miss = missCredit(task, item, RACERS.jevCode)
	const failed = { ...jevResult, ok: false, parsed: null, credit: miss, correct: toCorrect(miss) }
	const answers = jevAnswersSchema.safeParse(jevResult.parsed)
	if (!jevResult.ok || !answers.success) return failed

	const start = performance.now()
	try {
		const output = COMBINE_FNS[task.combine](answers.data, args)
		const elapsed = performance.now() - start
		const credit = scoreAnswer(task, item, RACERS.jevCode, output.answer)
		return {
			...jevResult,
			parsed: output,
			credit,
			correct: toCorrect(credit),
			latencyMs: jevResult.latencyMs + elapsed
		}
	} catch {
		// Jev's answers didn't fit the function (a missing or non-numeric
		// Choice): a miss, shown with Jev's raw response.
		return { ...failed, latencyMs: jevResult.latencyMs + (performance.now() - start) }
	}
}

/**
 * Wraps a RunEvent listener so every Jev event is followed by the matching
 * jev_code event. Works on live runs and replays alike. A task without
 * combine gets the listener back unchanged.
 *
 * Create one tap per run: its results accumulate for the run_finished totals.
 * A jev_code result's `parsed` is the CombineOutput `{ answer, detail? }`, not
 * the bare answer.
 */
export function createCombineTap(
	task: Task,
	onEvent: (event: RunEvent) => void,
	args?: CombineArgs
): (event: RunEvent) => void {
	if (!task.combine) return onEvent
	const itemsById = new Map(task.items.map((taskItem) => [taskItem.id, taskItem]))
	const results: ItemResult[] = []

	return (event) => {
		onEvent(event)
		if (event.racer !== RACERS.jev) return
		switch (event.type) {
			case RUN_EVENTS.itemStarted:
				onEvent({ ...event, racer: RACERS.jevCode })
				return
			case RUN_EVENTS.itemFinished: {
				const taskItem = itemsById.get(event.result.itemId)
				if (!taskItem) return
				const result = combineResult(task, taskItem, event.result, args)
				results.push(result)
				const codeMs = result.latencyMs - event.result.latencyMs
				onEvent({ ...event, racer: RACERS.jevCode, atMs: event.atMs + codeMs, result })
				return
			}
			case RUN_EVENTS.runFinished:
				// Code adds microseconds per item, so the wall time stays Jev's.
				onEvent({
					...event,
					racer: RACERS.jevCode,
					totals: computeTotals(results, event.totals.wallMs)
				})
				return
		}
	}
}

// A recording of any racer shown in Reveal, including the derived Jev + Code.
export type RaceRecording = Omit<Recording, 'racer'> & { racer: Racer }

/**
 * Jev + Code as a recording, derived from Jev's own: each event passed
 * through the task's combine function, never stored on disk (DESIGN 3.2).
 * Reveal uses it for the numbers and the per-item answers.
 */
export function jevCodeRecording(task: Task, jev: Recording): RaceRecording {
	const itemsById = new Map(task.items.map((item) => [item.id, item]))
	const events = jev.events.map((event) => {
		const item = itemsById.get(event.itemId)
		if (!item) return event
		const result = combineResult(task, item, event)
		return {
			...event,
			...result,
			endMs: event.endMs + (result.latencyMs - event.latencyMs)
		}
	})
	return { ...jev, racer: RACERS.jevCode, events, totals: computeTotals(events, jev.totals.wallMs) }
}
