'use server'

import { refresh } from 'next/cache'
import { z } from 'zod'
import { gameTaskId, recordedRun } from '@/content/game-runs'
import { MODES, SPEED_RACE_GAME_ID, XP_SOURCES } from '@/lib/constants'
import { AppError } from '@/lib/errors/app-error'
import { awardXp, syncBadges } from '@/server/awards/awards'
import { requireUser } from '@/server/auth/session'
import { db } from '@/server/db/client'
import { isBetterRun } from '@/runner/better-run'
import { validatedAction } from './validated-action'

// Developer mode: only the browser saw the live call, so the numbers come
// from the client. They are range-checked and only ever reach the user's own
// board (DESIGN 11.2).
const MAX_WALL_MS = 60 * 60 * 1000
const MAX_COST_USD = 1000
const MAX_RESULTS = 2

const resultSchema = z.strictObject({
	modelId: z.string().min(1).max(200),
	accuracy: z.number().min(0).max(1),
	wallMs: z.number().int().min(0).max(MAX_WALL_MS),
	costUsd: z.number().min(0).max(MAX_COST_USD).nullable()
})
type Result = z.infer<typeof resultSchema>

const inputSchema = z.discriminatedUnion('mode', [
	z.strictObject({
		mode: z.literal(MODES.beginner),
		gameId: z.string(),
		opponentModelId: z.string()
	}),
	z.strictObject({
		mode: z.literal(MODES.developer),
		gameId: z.string(),
		results: z.array(resultSchema).min(1).max(MAX_RESULTS)
	})
])

/**
 * A finished timed game: the Leaderboard keeps the best result per (game,
 * model, mode) and counts runs. Beginner numbers are recomputed here from the
 * recordings (the client sends ids only); a first Beginner run of a VS game
 * and opponent earns XP once. The Leaderboard stores numbers and model IDs only (R64).
 */
export const recordGameRun = validatedAction({
	input: inputSchema,
	handler: async (input) => {
		const { userId } = await requireUser()
		if (!gameTaskId(input.gameId)) {
			throw new AppError('That game does not exist.', { code: 'unknown_game' })
		}
		let results: Result[]
		if (input.mode === MODES.beginner) {
			const run = recordedRun(input.gameId, input.opponentModelId)
			if (!run) {
				throw new AppError('That opponent has no recording for this game.', {
					code: 'unknown_opponent'
				})
			}
			results = [run.jev, run.opponent].flatMap(({ modelId, totals }) =>
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
		} else {
			results = input.results
		}
		const outcome = await db.$transaction(async (tx) => {
			for (const result of results) {
				const key = {
					userId_gameId_modelId_mode: {
						userId,
						gameId: input.gameId,
						modelId: result.modelId,
						mode: input.mode
					}
				}
				const stored = await tx.leaderboardEntry.findUnique({ where: key })
				if (!stored) {
					await tx.leaderboardEntry.create({
						data: {
							userId,
							gameId: input.gameId,
							modelId: result.modelId,
							mode: input.mode,
							accuracy: result.accuracy,
							wallMs: result.wallMs,
							costUsd: result.costUsd
						}
					})
				} else {
					await tx.leaderboardEntry.update({
						where: key,
						data: isBetterRun(stored, result)
							? {
									accuracy: result.accuracy,
									wallMs: result.wallMs,
									costUsd: result.costUsd,
									runs: { increment: 1 }
								}
							: { runs: { increment: 1 } }
					})
				}
			}
			// Speed Race is a level (its XP comes from the level); Developer runs are
			// not recomputable here, so only Beginner runs earn game XP.
			const earnsXp = input.mode === MODES.beginner && input.gameId !== SPEED_RACE_GAME_ID
			const xp =
				earnsXp && input.mode === MODES.beginner
					? await awardXp(
							tx,
							userId,
							XP_SOURCES.gameDone,
							`${input.gameId}:${input.opponentModelId}`
						)
					: 0
			const badges = await syncBadges(tx, userId)
			return { xp, badges }
		})
		refresh()
		return { awards: outcome }
	}
})
