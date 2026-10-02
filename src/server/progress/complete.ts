import 'server-only'
import type { Level } from '@/content/level-schema'
import { getLevel } from '@/content/levels'
import { LEVEL_STATUS, XP_SOURCES, isLevelStatus, type LevelStatus } from '@/lib/constants'
import { AppError } from '@/lib/errors/app-error'
import { awardXp, type Tx } from '@/server/awards/awards'
import { isLevelComplete } from './rules'

const NOT_FOUND = 404

export function levelOrThrow(levelId: string): Level {
	const level = getLevel(levelId)
	if (!level) {
		throw new AppError('That level does not exist.', { status: NOT_FOUND, code: 'unknown_level' })
	}
	return level
}

export function statusOf(row: { status: string } | null): LevelStatus | null {
	return row && isLevelStatus(row.status) ? row.status : null
}

/** Marks the level done and awards it once Reveal is reached and every Check question is answered. */
export async function completeIfReady(
	tx: Tx,
	userId: string,
	level: Level
): Promise<{ levelDone: boolean; xp: number }> {
	const [row, answers] = await Promise.all([
		tx.levelProgress.findUnique({ where: { userId_levelId: { userId, levelId: level.id } } }),
		tx.checkAnswer.findMany({
			where: { userId, levelId: level.id },
			select: { questionId: true }
		})
	])
	if (row?.status === LEVEL_STATUS.done) return { levelDone: true, xp: 0 }
	const complete = isLevelComplete({
		revealed: row?.revealedAt != null,
		answeredQuestionIds: new Set(answers.map((answer) => answer.questionId)),
		level
	})
	if (!complete) return { levelDone: false, xp: 0 }
	await tx.levelProgress.update({
		where: { userId_levelId: { userId, levelId: level.id } },
		data: { status: LEVEL_STATUS.done }
	})
	const xp = await awardXp(tx, userId, XP_SOURCES.levelDone, level.id)
	return { levelDone: true, xp }
}
