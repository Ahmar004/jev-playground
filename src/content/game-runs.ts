import 'server-only'
import { LEVELS } from './levels'
import { GAMES } from './games'
import { currentRecordings } from './recordings'
import { RACERS, SPEED_RACE_GAME_ID } from '@/lib/constants'
import type { RunTotals } from '@/runner/types'

/** The task a timed game races: a game's task, or Speed Race's level task. */
export function gameTaskId(gameId: string): string | null {
	const game = GAMES.get(gameId)
	if (game) return game.taskId
	if (gameId === SPEED_RACE_GAME_ID) return LEVELS.get(gameId)?.tasks[0]?.id ?? null
	return null
}

export type RecordedRacer = { modelId: string; totals: RunTotals }

/** Jev's and one opponent's recorded totals, or null when either is missing. */
export function recordedRun(
	gameId: string,
	opponentModelId: string
): { jev: RecordedRacer; opponent: RecordedRacer } | null {
	const taskId = gameTaskId(gameId)
	if (!taskId) return null
	const recordings = currentRecordings(taskId)
	const jev = recordings.find((recording) => recording.racer === RACERS.jev)
	const opponent = recordings.find(
		(recording) => recording.racer === RACERS.llm && recording.modelId === opponentModelId
	)
	if (!jev || !opponent) return null
	return {
		jev: { modelId: jev.modelId, totals: jev.totals },
		opponent: { modelId: opponent.modelId, totals: opponent.totals }
	}
}
