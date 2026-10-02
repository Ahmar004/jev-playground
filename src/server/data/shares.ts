import 'server-only'
import { arenaSnapshotSchema, type ArenaSnapshot } from '@/features/arena/snapshot'
import { db } from '@/server/db/client'

/**
 * One share's snapshot, read from the database on every request and never
 * cached. A cached read kept serving a deleted share once more (verified on
 * a production build, with `use cache` plus `updateTag`), and R87 needs the
 * link dead at once. A payload that no longer validates counts as missing.
 */
export async function getShare(shareId: string): Promise<ArenaSnapshot | null> {
	const row = await db.share.findUnique({ where: { id: shareId }, select: { payload: true } })
	if (!row) return null
	const parsed = arenaSnapshotSchema.safeParse(row.payload)
	return parsed.success ? parsed.data : null
}

export type MyShare = { id: string; title: string; mode: string; createdAt: string }

/** The signed-in user's own shares, newest first. Per-user, so never cached. */
export async function getMyShares(userId: string): Promise<MyShare[]> {
	const rows = await db.share.findMany({
		where: { userId },
		orderBy: { createdAt: 'desc' },
		select: { id: true, mode: true, createdAt: true, payload: true }
	})
	return rows.map((row) => {
		const parsed = arenaSnapshotSchema.safeParse(row.payload)
		return {
			id: row.id,
			title: parsed.success ? parsed.data.title : 'Shared result',
			mode: row.mode,
			createdAt: row.createdAt.toISOString()
		}
	})
}
