import { CLAUDE_MODELS, RACERS, type Racer } from '@/lib/constants'

// Display names for the models Beginner mode records (spec 3.2). Any other
// model shows its id.
export const MODEL_NAMES: Readonly<Record<string, string>> = {
	[CLAUDE_MODELS.opus]: 'Claude Opus 5.5',
	[CLAUDE_MODELS.sonnet]: 'Claude Sonnet 5.5',
	[CLAUDE_MODELS.haiku]: 'Claude Haiku 4.5'
}

const LLM_NAME = 'LLM'

const RACER_NAMES: Record<Exclude<Racer, typeof RACERS.llm>, string> = {
	[RACERS.jev]: 'Jev',
	[RACERS.code]: 'Code',
	[RACERS.jevCode]: 'Jev + Code'
}

/** A racer's name. An LLM shows its model's name, else its model id, else "LLM". */
export function racerName(racer: Racer, modelId?: string): string {
	if (racer !== RACERS.llm) return RACER_NAMES[racer]
	if (!modelId) return LLM_NAME
	return MODEL_NAMES[modelId] ?? modelId
}
