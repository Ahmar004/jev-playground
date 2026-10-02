'use server'

import { refresh } from 'next/cache'
import { z } from 'zod'
import { PRESETS } from '@/content/arena'
import { XP_SOURCES } from '@/lib/constants'
import { AppError } from '@/lib/errors/app-error'
import { awardXp, syncBadges } from '@/server/awards/awards'
import { requireUser } from '@/server/auth/session'
import { db } from '@/server/db/client'
import { validatedAction } from './validated-action'

/**
 * A finished Beginner preset replay: the first run of each preset earns XP
 * once. Developer runs earn nothing here, since only the browser saw them
 * (DESIGN 11.2), and the Leaderboard covers timed games only.
 */
export const recordArenaRun = validatedAction({
	input: z.strictObject({ presetId: z.string().min(1).max(80) }),
	handler: async ({ presetId }) => {
		const { userId } = await requireUser()
		if (!PRESETS.has(presetId)) {
			throw new AppError('That preset does not exist.', { code: 'unknown_preset' })
		}
		const outcome = await db.$transaction(async (tx) => {
			const xp = await awardXp(tx, userId, XP_SOURCES.arenaPreset, presetId)
			const badges = await syncBadges(tx, userId)
			return { xp, badges }
		})
		refresh()
		return { awards: outcome }
	}
})
