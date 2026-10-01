import type { PriceTable } from '@/content/prices'
import { recordingSchema, type Recording } from '@/content/recording-schema'
import { taskHash } from '@/content/task-hash'
import type { Task } from '@/content/task-schema'
import { RACE_LANES, RACERS, RUN_EVENTS } from '@/lib/constants'
import { priceFor } from '@/runner/cost'
import { jevRacer, llmRacer } from '@/runner/racers'
import { runItems } from '@/runner/run'
import type { JevRequestBody, ProviderResult, RunEvent } from '@/runner/types'
import type { Target } from './targets'

// The provider calls with the owner's key bound by the caller (scripts/record.ts).
export type ProviderCalls = {
	jev: (body: JevRequestBody, signal: AbortSignal) => Promise<ProviderResult>
	llm: (modelId: string, prompt: string, signal: AbortSignal) => Promise<ProviderResult>
}

type RecordOptions = {
	calls: ProviderCalls
	prices: PriceTable
	recordedAt: Date
	signal?: AbortSignal
	onEvent?: (event: RunEvent) => void
	now?: () => number
}

type RecordedEvent = Recording['events'][number]

/**
 * Runs one racer over a task through the shared runner (R92) and returns the
 * Recording. Every result is stored as it happened: failed and unparseable
 * calls included (R44, spec 12.4).
 */
export async function recordTarget(
	task: Task,
	target: Target,
	options: RecordOptions
): Promise<Recording> {
	const { calls, prices, recordedAt, signal, onEvent, now } = options
	// The model each response says answered: the recording names that one.
	const answeredBy = new Set<string>()
	const noteModel = async (call: Promise<ProviderResult>) => {
		const result = await call
		answeredBy.add(result.modelId)
		return result
	}

	const runItem =
		target.racer === RACERS.jev
			? jevRacer({ task, prices, call: (body, s) => noteModel(calls.jev(body, s)) })
			: llmRacer({
					task,
					prices,
					modelId: target.modelId,
					call: (prompt, s) => noteModel(calls.llm(target.modelId, prompt, s))
				})

	const startedAt = new Map<string, number>()
	const events: RecordedEvent[] = []
	const totals = await runItems(task, target.racer, runItem, {
		lanes: RACE_LANES,
		...(signal ? { signal } : {}),
		...(now ? { now } : {}),
		onEvent: (event) => {
			if (event.type === RUN_EVENTS.itemStarted) startedAt.set(event.itemId, event.atMs)
			if (event.type === RUN_EVENTS.itemFinished) {
				const startMs = startedAt.get(event.result.itemId) ?? event.atMs
				events.push({ ...event.result, lane: event.lane, startMs, endMs: event.atMs })
			}
			onEvent?.(event)
		}
	})
	if (!totals) throw new Error('Recording aborted; nothing was written')

	if (answeredBy.size > 1) {
		throw new Error(
			`One run was answered by more than one model (${[...answeredBy].join(', ')}); nothing was written`
		)
	}
	const modelId = [...answeredBy][0] ?? target.modelId
	// An LLM recording is filed under the requested id; a different answering id
	// would never match the skip lookup and would be re-recorded (and re-paid).
	if (target.racer === RACERS.llm && modelId !== target.modelId) {
		throw new Error(
			`Asked ${target.modelId} but ${modelId} answered; nothing was written. Use the answering id as the model id.`
		)
	}
	// Every call failing is a setup problem (key, network), not a model result.
	if (events.length > 0 && events.every((event) => event.error)) {
		const kinds = new Set(events.map((event) => event.error))
		throw new Error(
			`Every call failed (${[...kinds].join(', ')}); nothing was written. Check the key and network.`
		)
	}
	const order = new Map(task.items.map((item, index) => [item.id, index]))
	events.sort((a, b) => (order.get(a.itemId) ?? 0) - (order.get(b.itemId) ?? 0))

	return recordingSchema.parse({
		taskId: task.id,
		taskHash: taskHash(task),
		racer: target.racer,
		modelId,
		recordedAt: recordedAt.toISOString(),
		price: priceFor(prices, [modelId, target.modelId]),
		lanes: RACE_LANES,
		events,
		totals
	})
}
