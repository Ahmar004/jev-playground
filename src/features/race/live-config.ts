import type { PriceTable } from '@/content/prices'
import type { LlmProvider } from '@/lib/constants'
import type { JevCall, LlmCall } from '@/runner/racers'

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
