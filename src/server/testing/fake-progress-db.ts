import { vi } from 'vitest'

type Row = Record<string, unknown>
type Where = Record<string, unknown>

/** Prisma nests a compound unique where (userId_levelId: {...}); flatten it for matching. */
function flatten(where: Where): Where {
	const flat: Where = {}
	for (const [key, value] of Object.entries(where)) {
		if (value && typeof value === 'object' && key.includes('_')) Object.assign(flat, value)
		else flat[key] = value
	}
	return flat
}

function matches(row: Row, where: Where): boolean {
	return Object.entries(flatten(where)).every(([key, value]) => (row[key] ?? null) === value)
}

function table(uniqueKeys: string[]) {
	const rows: Row[] = []
	const sameKey = (a: Row, b: Row) => uniqueKeys.every((key) => a[key] === b[key])
	return {
		rows,
		findUnique: vi.fn(async ({ where }: { where: Where }) => {
			return rows.find((row) => matches(row, where)) ?? null
		}),
		findMany: vi.fn(async ({ where }: { where?: Where } = {}) => {
			return rows.filter((row) => matches(row, where ?? {}))
		}),
		count: vi.fn(async ({ where }: { where?: Where } = {}) => {
			return rows.filter((row) => matches(row, where ?? {})).length
		}),
		createMany: vi.fn(async ({ data }: { data: Row[]; skipDuplicates?: boolean }) => {
			let count = 0
			for (const item of data) {
				if (rows.some((row) => sameKey(row, item))) continue
				rows.push({ ...item })
				count += 1
			}
			return { count }
		}),
		update: vi.fn(async ({ where, data }: { where: Where; data: Row }) => {
			const row = rows.find((entry) => matches(entry, where))
			if (!row) throw new Error('row not found')
			Object.assign(row, data)
			return row
		}),
		updateMany: vi.fn(async ({ where, data }: { where: Where; data: Row }) => {
			const hits = rows.filter((entry) => matches(entry, where))
			for (const row of hits) Object.assign(row, data)
			return { count: hits.length }
		}),
		upsert: vi.fn(async ({ where, create, update }: { where: Where; create: Row; update: Row }) => {
			const row = rows.find((entry) => matches(entry, where))
			if (row) return Object.assign(row, update)
			rows.push({ ...create })
			return create
		})
	}
}

/** An in-memory stand-in for the progress tables, shaped like the Prisma delegates. */
export function createFakeProgressDb() {
	const levelProgress = table(['userId', 'levelId'])
	const checkAnswer = table(['userId', 'questionId'])
	const xpEvent = table(['userId', 'source', 'sourceId'])
	const userBadge = table(['userId', 'badgeId'])
	const leaderboardEntry = { findMany: vi.fn(async () => []) }
	const quizAttempt = { findMany: vi.fn(async () => []) }
	const tx = { levelProgress, checkAnswer, xpEvent, userBadge, leaderboardEntry, quizAttempt }
	const db = {
		...tx,
		$transaction: vi.fn(async (fn: (client: typeof tx) => Promise<unknown>) => fn(tx))
	}
	return { db, tx }
}
