import 'server-only'
import { LEVELS } from '@/content/levels'
import { currentRecordings } from '@/content/recordings'
import { judgeAll, judgedTotals } from '@/features/levels/judge'
import { PREDICTION_OUTCOMES, RACERS } from '@/lib/constants'

export type JevRecord = { wins: number; losses: number }

/**
 * Jev's wins and losses on each level the user finished: every metric a level
 * asks about is one contest between Jev and the opponent the user raced, read
 * from the recorded numbers. Ties and metrics with a missing number count for
 * neither side.
 */
export function jevRecord(opponents: { levelId: string; opponentModelId: string }[]): JevRecord {
	const record: JevRecord = { wins: 0, losses: 0 }
	for (const { levelId, opponentModelId } of opponents) {
		const level = LEVELS.get(levelId)
		if (!level) continue
		const recordings = level.tasks.flatMap((task) => currentRecordings(task.id))
		const totals = judgedTotals(level, recordings, opponentModelId)
		if (!totals) continue
		// Judge as if Jev had been picked for every metric: right means Jev won.
		const picks = Object.fromEntries(
			level.predict.questions.map((question) => [question.metric, RACERS.jev])
		)
		for (const verdict of judgeAll(level, picks, totals.jev, totals.opponent)) {
			if (verdict.outcome === PREDICTION_OUTCOMES.right) record.wins += 1
			else if (verdict.outcome === PREDICTION_OUTCOMES.wrong) record.losses += 1
		}
	}
	return record
}
