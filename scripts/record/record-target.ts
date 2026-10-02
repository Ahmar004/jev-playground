import type { PriceTable } from '@/content/prices'
import { recordingSchema, type Recording } from '@/content/recording-schema'
import { taskHash } from '@/content/task-hash'
import type { Task } from '@/content/task-schema'
import {
	PROVIDER_ERROR_KINDS,
	RACE_LANES,
	RACERS,
	RUN_EVENTS,
	TASK_KINDS,
	type ProviderErrorKind
} from '@/lib/constants'
import { priceFor } from '@/runner/cost'
import { ProviderError } from '@/runner/providers/provider-error'
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

// Provider-side failures that stop a model's run instead of being stored.
const ABORTING_KINDS: ReadonlySet<ProviderErrorKind> = new Set([
	PROVIDER_ERROR_KINDS.rateLimited,
	PROVIDER_ERROR_KINDS.overloaded,
	PROVIDER_ERROR_KINDS.network
])

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
	// Throws on the first reply that would make the recording untrustworthy, so
	// the runner aborts the sibling lanes and few paid calls are lost.
	const noteModel = (result: ProviderResult): ProviderResult => {
		if (target.racer === RACERS.llm && result.modelId !== target.modelId) {
			throw new Error(
				`Asked ${target.modelId} but ${result.modelId} answered; nothing was written. Use the answering id as the model id.`
			)
		}
		answeredBy.add(result.modelId)
		if (answeredBy.size > 1) {
			throw new Error(
				`One run was answered by more than one model (${[...answeredBy].join(', ')}); nothing was written`
			)
		}
		return result
	}
	// A rate limit, overload or network failure measures the account, not the
	// model: it stops the run (a plain Error is not stored as a result).
	const guard = async (call: Promise<ProviderResult>): Promise<ProviderResult> => {
		try {
			return noteModel(await call)
		} catch (error) {
			if (error instanceof ProviderError && ABORTING_KINDS.has(error.kind)) {
				throw new Error(
					`${error.kind} while recording ${target.taskId} / ${target.slug}; nothing was written. Wait a while or check the account's rate limits, then run it again.`
				)
			}
			throw error
		}
	}

	const runItem =
		target.racer === RACERS.jev
			? jevRacer({ task, prices, call: (body, s) => guard(calls.jev(body, s)) })
			: llmRacer({
					task,
					prices,
					modelId: target.modelId,
					call: (prompt, s) => guard(calls.llm(target.modelId, prompt, s))
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
	// Except level 2: Jev is sent a question type it does not offer, and the
	// real rejection (a 400 or 422) is the result worth showing (DESIGN 7).
	const expectedRejection =
		task.kind === TASK_KINDS.generate &&
		target.racer === RACERS.jev &&
		events.every((event) => event.error === PROVIDER_ERROR_KINDS.malformed)
	if (events.length > 0 && events.every((event) => event.error) && !expectedRejection) {
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
