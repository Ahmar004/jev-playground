import 'server-only'
import { cache } from 'react'
import { isGuidePart, type GuidePart } from '@/lib/constants'
import { db } from '@/server/db/client'

/** The guide parts this user has seen (ROADMAP Step-35). Per user, so never in 'use cache'; cache() dedupes within a request. */
export const getGuideSeen = cache(async (userId: string): Promise<GuidePart[]> => {
	const row = await db.user.findUnique({ where: { id: userId }, select: { guideSeen: true } })
	return (row?.guideSeen ?? []).filter(isGuidePart)
})
