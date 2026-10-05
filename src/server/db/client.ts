import 'server-only'
import { PrismaPg } from '@prisma/adapter-pg'
import { attachDatabasePool } from '@vercel/functions'
import { Pool } from 'pg'
import { PrismaClient } from './generated/client'
import { poolConnectionLimit, poolIdleTimeout } from './pool-config'
import { databaseSsl } from './tls'

// Re-exported from the one file allowed to import the generated client, so
// callers that need the Prisma namespace at runtime (Prisma.DbNull to clear a
// nullable Json column, or Prisma.* input types) get it from here rather than
// reaching for the banned import directly. See docs/rules/database.md.
export { Prisma } from './generated/client'

function createClient(): PrismaClient {
	// Prisma 7 connects through a driver adapter. DATABASE_URL is the Supavisor
	// transaction pooler (port 6543), so serverless functions share a small
	// pool instead of each opening its own Postgres connections. TLS is
	// verified against the Supabase CA (src/server/db/tls.ts).
	// The pool is built here, not inside the adapter, so Vercel can see it: its
	// helper closes the idle connections of an instance that is being suspended
	// (ROADMAP Step-30). The size is in pool-config.ts (40 locally, 5 on Vercel).
	const pool = new Pool({
		connectionString: process.env.DATABASE_URL,
		ssl: databaseSsl(process.env.DATABASE_URL),
		max: poolConnectionLimit({
			VERCEL: process.env.VERCEL,
			DATABASE_POOL_MAX: process.env.DATABASE_POOL_MAX
		}),
		idleTimeoutMillis: poolIdleTimeout({ VERCEL: process.env.VERCEL })
	})
	if (process.env.VERCEL) attachDatabasePool(pool)
	return new PrismaClient({ adapter: new PrismaPg(pool) })
}

// Cache the client on globalThis outside production so hot-reload during
// `next dev` doesn't open a fresh connection pool on every file save.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }

export const db = globalForPrisma.prisma ?? createClient()

if (process.env.NODE_ENV !== 'production') {
	globalForPrisma.prisma = db
}
