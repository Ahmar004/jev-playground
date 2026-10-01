import type { Recording } from '@/content/recording-schema'
import { CLAUDE_MODELS, DEFAULT_OPPONENT, RACERS } from '@/lib/constants'

export type Lineup = { jev: Recording | undefined; opponents: Recording[] }

// Opus, Sonnet, Haiku; any other model after them by id.
const MODEL_ORDER: readonly string[] = Object.values(CLAUDE_MODELS)

function modelRank(modelId: string): number {
	const index = MODEL_ORDER.indexOf(modelId)
	return index === -1 ? MODEL_ORDER.length : index
}

/** Jev's recording and the LLM recordings Jev can race, in picker order. */
export function raceLineup(recordings: Recording[]): Lineup {
	return {
		jev: recordings.find((recording) => recording.racer === RACERS.jev),
		opponents: recordings
			.filter((recording) => recording.racer === RACERS.llm)
			.sort(
				(a, b) => modelRank(a.modelId) - modelRank(b.modelId) || a.modelId.localeCompare(b.modelId)
			)
	}
}

/** Jev faces Opus 5.5 by default (DESIGN 1), else the first recorded LLM. */
export function defaultOpponentId(opponents: Recording[]): string | undefined {
	return (
		opponents.find((recording) => recording.modelId === DEFAULT_OPPONENT)?.modelId ??
		opponents[0]?.modelId
	)
}
