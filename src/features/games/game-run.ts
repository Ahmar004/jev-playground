import type { RaceResult } from '@/features/race/race-stage'
import { MODES, RACERS, type Mode } from '@/lib/constants'

type RunResult = { modelId: string; accuracy: number; wallMs: number; costUsd: number | null }

// What recordGameRun takes (DESIGN 11.3). Beginner sends ids only; the server
// recomputes the numbers from the recordings.
export type GameRunInput =
	| { mode: typeof MODES.beginner; gameId: string; opponentModelId: string }
	| { mode: typeof MODES.developer; gameId: string; results: RunResult[] }

/** The call for a finished race, or null when there is nothing to record. */
export function gameRunInput({
	gameId,
	mode,
	results
}: {
	gameId: string
	mode: Mode
	results: RaceResult[]
}): GameRunInput | null {
	const opponent = results.find((result) => result.racer === RACERS.llm)
	if (mode === MODES.beginner) {
		return opponent ? { mode, gameId, opponentModelId: opponent.modelId } : null
	}
	const scored = results.flatMap(({ modelId, totals }): RunResult[] =>
		totals.accuracy === null
			? []
			: [
					{
						modelId,
						accuracy: totals.accuracy,
						wallMs: Math.round(totals.wallMs),
						costUsd: totals.costUsd
					}
				]
	)
	return scored.length > 0 ? { mode, gameId, results: scored } : null
}
