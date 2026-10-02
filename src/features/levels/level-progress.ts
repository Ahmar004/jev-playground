import type { LevelStatus } from '@/lib/constants'
import type { Prediction } from './judge'

/** One user's saved state on one Level, as the level page and its hooks read it. */
export type LevelProgressView = {
	status: LevelStatus | null
	// {} when none.
	prediction: Prediction
	revealed: boolean
	opponentModelId: string | null
	predictionCorrect: boolean | null
	// By question id: the first answer, which decided the XP.
	answers: Record<string, { optionId: string; correct: boolean }>
}
