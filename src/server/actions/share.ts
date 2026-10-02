'use server'

import { randomBytes } from 'node:crypto'
import { refresh } from 'next/cache'
import { z } from 'zod'
import { presetView } from '@/content/arena'
import { arenaSnapshotSchema, type ArenaSnapshot } from '@/features/arena/snapshot'
import { BADGES, MODES, SHARE_LIMITS } from '@/lib/constants'
import { AppError } from '@/lib/errors/app-error'
import { grantBadge } from '@/server/awards/awards'
import { requireUser } from '@/server/auth/session'
import { db, type Prisma } from '@/server/db/client'
import { validatedAction } from './validated-action'

const SHARE_ID_BYTES = 16
const HTTP_TOO_MANY = 429
const HTTP_NOT_FOUND = 404

const inputSchema = z.discriminatedUnion('mode', [
	// Beginner: the client sends ids only and the server builds the snapshot
	// from the Recordings (DESIGN 11.2).
	z.strictObject({
		mode: z.literal(MODES.beginner),
		presetId: z.string().min(1).max(80),
		opponentModelId: z.string().min(1).max(200)
	}),
	// Developer: only the browser saw the live call, so it sends the snapshot.
	z.strictObject({
		mode: z.literal(MODES.developer),
		consent: z.boolean(),
		snapshot: arenaSnapshotSchema
	})
])

/** True when the snapshot holds text the user wrote: a custom task, or a preset's input they edited. */
function holdsUserText(snapshot: ArenaSnapshot): boolean {
	if (!snapshot.presetId) return true
	const view = presetView(snapshot.presetId)
	return !view || view.state !== snapshot.state
}

function beginnerSnapshot(presetId: string, opponentModelId: string): ArenaSnapshot {
	const view = presetView(presetId)
	if (!view) throw new AppError('That preset does not exist.', { code: 'unknown_preset' })
	const opponent = view.opponents.find((side) => side.modelId === opponentModelId)
	if (!view.jev || !opponent) {
		throw new AppError('That opponent has no recording for this preset.', {
			code: 'unknown_opponent'
		})
	}
	return arenaSnapshotSchema.parse({
		mode: MODES.beginner,
		title: view.preset.title,
		presetId,
		question: view.question,
		state: view.state,
		...(view.expected === null ? {} : { expected: view.expected }),
		sides: [view.jev, opponent]
	})
}

/**
 * Saves an Arena result as a read-only snapshot under an unguessable id.
 * A snapshot with the user's own text needs their consent, a user may create
 * a limited number a day (counted from Share rows), and the first share earns
 * the Sharer badge.
 */
export const createShare = validatedAction({
	input: inputSchema,
	handler: async (input) => {
		const { userId } = await requireUser()
		let snapshot: ArenaSnapshot
		if (input.mode === MODES.beginner) {
			snapshot = beginnerSnapshot(input.presetId, input.opponentModelId)
		} else {
			snapshot = input.snapshot
			if (snapshot.mode !== MODES.developer) {
				throw new AppError('A Developer mode share must be labelled Developer mode.', {
					code: 'mode_mismatch'
				})
			}
			if (snapshot.presetId && !presetView(snapshot.presetId)) {
				throw new AppError('That preset does not exist.', { code: 'unknown_preset' })
			}
			if (holdsUserText(snapshot) && !input.consent) {
				throw new AppError('Confirm that this share will be public before creating it.', {
					code: 'consent_required'
				})
			}
		}
		const since = new Date(Date.now() - SHARE_LIMITS.windowMs)
		const recent = await db.share.count({ where: { userId, createdAt: { gte: since } } })
		if (recent >= SHARE_LIMITS.perUserPerDay) {
			throw new AppError(
				`You can create ${SHARE_LIMITS.perUserPerDay} shares a day. Delete one or try again tomorrow.`,
				{ status: HTTP_TOO_MANY, code: 'share_limit' }
			)
		}
		const id = randomBytes(SHARE_ID_BYTES).toString('base64url')
		const badges = await db.$transaction(async (tx) => {
			// A JSON round trip drops `undefined`s, leaving the plain JSON the column stores.
			const payload: Prisma.InputJsonValue = JSON.parse(JSON.stringify(snapshot))
			await tx.share.create({ data: { id, userId, mode: snapshot.mode, payload } })
			return (await grantBadge(tx, userId, BADGES.sharer)) ? [BADGES.sharer] : []
		})
		refresh()
		return { id, badges }
	}
})

/** Deletes the user's own share. The page reads the row on every request, so its link stops working at once (R87). */
export const deleteShare = validatedAction({
	input: z.strictObject({ shareId: z.string().min(1).max(64) }),
	handler: async ({ shareId }) => {
		const { userId } = await requireUser()
		const { count } = await db.share.deleteMany({ where: { id: shareId, userId } })
		if (count === 0) throw new AppError('That share does not exist.', { status: HTTP_NOT_FOUND })
		refresh()
		return { deleted: true }
	}
})
