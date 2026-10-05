'use server'

import { refresh } from 'next/cache'
import { z } from 'zod'
import { mergeGuideSeen } from '@/features/guide/guide'
import { GUIDE_PART_LIST, type GuidePart } from '@/lib/constants'
import { requireUser } from '@/server/auth/session'
import { db } from '@/server/db/client'
import { validatedAction } from './validated-action'

const guidePartSchema = z.enum(GUIDE_PART_LIST)

/**
 * Records guide parts the user has seen or skipped (ROADMAP Step-35). It only
 * ever touches the signed-in user's own row. refresh() drops the router's
 * cached copy of the page, so going Back never reopens a finished tour.
 */
export const markGuideSeen = validatedAction({
	input: z.strictObject({ parts: z.array(guidePartSchema).min(1) }),
	handler: async ({ parts }): Promise<{ seen: GuidePart[] }> => {
		const { userId } = await requireUser()
		const seen = await db.$transaction(async (tx) => {
			const row = await tx.user.findUnique({ where: { id: userId }, select: { guideSeen: true } })
			const current = row?.guideSeen ?? []
			const next = mergeGuideSeen(current, parts)
			if (next.length !== mergeGuideSeen(current, []).length) {
				await tx.user.update({ where: { id: userId }, data: { guideSeen: next } })
			}
			return next
		})
		refresh()
		return { seen }
	}
})

/** Replays the guide: the welcome tour opens on Home again and every level tip shows once more. */
export const resetGuide = validatedAction({
	input: z.unknown(),
	handler: async (): Promise<{ seen: GuidePart[] }> => {
		const { userId } = await requireUser()
		await db.user.update({ where: { id: userId }, data: { guideSeen: [] } })
		refresh()
		return { seen: [] }
	}
})
