import type { PriceTable } from '@/content/prices'
import type { Task, TaskItem } from '@/content/task-schema'
import { RACERS, type Racer } from '@/lib/constants'
import { CODE_FNS } from './code/code-fns'
import { costUsd, priceFor } from './cost'
import { buildJevRequest } from './jev-request'
import { buildLlmPrompt } from './llm-prompt'
import { parseJevAnswers, parseLlmAnswer } from './parse'
import { ProviderError } from './providers/provider-error'
import { missCredit, scoreAnswer, scoreJev, toCorrect } from './score'
import type { ItemResult, ItemRunner, JevRequestBody, ProviderResult } from './types'

// The provider call, with the key bound by the caller. The runner never sees a key.
export type JevCall = (body: JevRequestBody, signal: AbortSignal) => Promise<ProviderResult>
export type LlmCall = (prompt: string, signal: AbortSignal) => Promise<ProviderResult>

const NO_USAGE = { inputTokens: 0, outputTokens: 0 }
// A failed call is not billed, and Code costs nothing.
const NO_COST = 0

function failedResult(task: Task, item: TaskItem, racer: Racer, error: ProviderError): ItemResult {
	const credit = missCredit(task, item, racer)
	return {
		itemId: item.id,
		ok: false,
		raw: error.body,
		parsed: null,
		credit,
		correct: toCorrect(credit),
		latencyMs: error.latencyMs,
		usage: NO_USAGE,
		costUsd: NO_COST,
		error: error.kind
	}
}

async function callOnce(
	run: () => Promise<ProviderResult>
): Promise<{ ok: true; value: ProviderResult } | { ok: false; error: ProviderError }> {
	try {
		return { ok: true, value: await run() }
	} catch (error) {
		if (error instanceof ProviderError) return { ok: false, error }
		throw error
	}
}

export function jevRacer({
	task,
	call,
	prices
}: {
	task: Task
	call: JevCall
	prices: PriceTable
}): ItemRunner {
	return async (item, signal) => {
		const outcome = await callOnce(() => call(buildJevRequest(task, item), signal))
		if (!outcome.ok) return failedResult(task, item, RACERS.jev, outcome.error)
		const { text, latencyMs, usage, modelId } = outcome.value
		const parsed = parseJevAnswers(task, item, text)
		const credit = parsed.ok
			? scoreJev(task, item, parsed.parsed)
			: missCredit(task, item, RACERS.jev)
		return {
			itemId: item.id,
			ok: parsed.ok,
			raw: text,
			parsed: parsed.parsed,
			credit,
			correct: toCorrect(credit),
			latencyMs,
			usage,
			costUsd: costUsd(usage, priceFor(prices, [modelId]))
		}
	}
}

export function llmRacer({
	task,
	modelId,
	call,
	prices
}: {
	task: Task
	modelId: string
	call: LlmCall
	prices: PriceTable
}): ItemRunner {
	return async (item, signal) => {
		const outcome = await callOnce(() => call(buildLlmPrompt(task, item), signal))
		if (!outcome.ok) return failedResult(task, item, RACERS.llm, outcome.error)
		const { text, latencyMs, usage } = outcome.value
		const parsed = parseLlmAnswer(task.kind, text)
		const credit = parsed.ok
			? scoreAnswer(task, item, RACERS.llm, parsed.parsed)
			: missCredit(task, item, RACERS.llm)
		return {
			itemId: item.id,
			ok: parsed.ok,
			raw: text,
			parsed: parsed.parsed,
			credit,
			correct: toCorrect(credit),
			latencyMs,
			usage,
			costUsd: costUsd(usage, priceFor(prices, [outcome.value.modelId, modelId]))
		}
	}
}

/** The Code racer: the task's deterministic function, timed, $0 (DESIGN 3.2). */
export function codeRacer(task: Task): ItemRunner {
	const { code } = task
	if (!code) throw new Error(`${task.id} has no Code function`)
	const fn = CODE_FNS[code]
	return async (item) => {
		const start = performance.now()
		let answer: ReturnType<typeof fn>
		try {
			answer = fn(item.state)
		} catch {
			// The state doesn't fit the function: a miss, never hidden.
			const credit = missCredit(task, item, RACERS.code)
			return {
				itemId: item.id,
				ok: false,
				raw: '',
				parsed: null,
				credit,
				correct: toCorrect(credit),
				latencyMs: performance.now() - start,
				usage: NO_USAGE,
				costUsd: NO_COST
			}
		}
		const latencyMs = performance.now() - start
		const credit = scoreAnswer(task, item, RACERS.code, answer)
		return {
			itemId: item.id,
			ok: true,
			raw: JSON.stringify(answer),
			parsed: answer,
			credit,
			correct: toCorrect(credit),
			latencyMs,
			usage: NO_USAGE,
			costUsd: NO_COST
		}
	}
}
