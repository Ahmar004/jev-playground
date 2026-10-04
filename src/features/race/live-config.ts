import type { PriceTable } from '@/content/prices'
import { JEV_MODEL_ALIAS, RACERS, type LlmProvider, type Racer } from '@/lib/constants'
import type { Task } from '@/content/task-schema'
import { stopOnProviderFailure } from '@/runner/live'
import { jevRacer, llmRacer, type JevCall, type LlmCall } from '@/runner/racers'
import type { LiveRace } from './use-race'

/** Everything a live race needs, with the keys already bound into the calls (the runner never sees a key). */
export type LiveConfig = {
	jevCall: JevCall
	llmCall: LlmCall
	llmProvider: LlmProvider
	// The model the user picked; the model that answered is shown once a call returns.
	llmModelId: string
	prices: PriceTable
	// The versioned model ids the providers answered with, once known.
	answered: { jev?: string; llm?: string }
}

/** The model a live racer's results belong to: the one that answered, else the one asked for. */
export function liveModelId(live: LiveConfig, racer: Racer): string {
	return racer === RACERS.llm
		? (live.answered.llm ?? live.llmModelId)
		: (live.answered.jev ?? JEV_MODEL_ALIAS)
}

/** Jev's and the LLM's live runners for one task, through the shared runner (R92). */
export function liveRunners(task: Task, live: LiveConfig): LiveRace {
	return {
		jev: stopOnProviderFailure(jevRacer({ task, call: live.jevCall, prices: live.prices })),
		llm: stopOnProviderFailure(
			llmRacer({ task, modelId: live.llmModelId, call: live.llmCall, prices: live.prices })
		)
	}
}
