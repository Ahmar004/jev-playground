import 'server-only'
import { createHash } from 'node:crypto'
import { RATE_LIMIT_PURGE_MS } from '@/lib/constants'
import { AppError } from '@/lib/errors/app-error'
import { db } from '@/server/db/client'
import { log } from '@/server/lib/logger'

const HTTP_TOO_MANY_REQUESTS = 429
const MS_PER_SECOND = 1000

export type RateLimitRule = { bucket: string; limit: number; windowMs: number }
export type RateLimitResult = { allowed: boolean; retryAfterSec: number }

/**
 * Counts one hit for `key` in the current fixed window and says whether it is
 * still within the rule. The count is one atomic upsert in Postgres, so every
 * server instance shares it. The key is stored only as a hash. If the database
 * fails the request is allowed: a broken limiter must not lock users out.
 */
export async function checkRateLimit(
	rule: RateLimitRule,
	key: string,
	now: number = Date.now()
): Promise<RateLimitResult> {
	const windowStartMs = Math.floor(now / rule.windowMs) * rule.windowMs
	const windowStart = new Date(windowStartMs)
	const keyHash = createHash('sha256').update(key).digest('hex')
	try {
		const { count } = await db.rateLimitCounter.upsert({
			where: { bucket_keyHash_windowStart: { bucket: rule.bucket, keyHash, windowStart } },
			create: { bucket: rule.bucket, keyHash, windowStart, count: 1 },
			update: { count: { increment: 1 } }
		})
		// A key's first hit in a window is the cheap moment to clear what no window needs any more.
		if (count === 1) {
			await db.rateLimitCounter.deleteMany({
				where: { windowStart: { lt: new Date(now - RATE_LIMIT_PURGE_MS) } }
			})
		}
		if (count <= rule.limit) return { allowed: true, retryAfterSec: 0 }
		const retryAfterSec = Math.ceil((windowStartMs + rule.windowMs - now) / MS_PER_SECOND)
		return { allowed: false, retryAfterSec }
	} catch (error) {
		log.warn('rate limit check failed, request allowed', {
			bucket: rule.bucket,
			error: error instanceof Error ? error.message : 'unknown'
		})
		return { allowed: true, retryAfterSec: 0 }
	}
}

/** Like checkRateLimit, but throws the 429 a Server Action shows as its message. */
export async function assertWithinLimit(
	rule: RateLimitRule,
	key: string,
	now: number = Date.now()
): Promise<void> {
	const { allowed, retryAfterSec } = await checkRateLimit(rule, key, now)
	if (allowed) return
	throw new AppError(`Too many attempts. Wait ${retryAfterSec} seconds and try again.`, {
		status: HTTP_TOO_MANY_REQUESTS,
		code: 'rate_limited'
	})
}
