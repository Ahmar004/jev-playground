import 'server-only'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from './generated/client'
import { databaseSsl } from './tls'

// Re-exported from the one file allowed to import the generated client, so
// callers that need the Prisma namespace at runtime (Prisma.DbNull to clear a
// nullable Json column, or Prisma.* input types) get it from here rather than
// reaching for the banned import directly. See docs/rules/database.md.
export { Prisma } from './generated/client'

// Connections per server process. Every signed-in page runs at least 3 queries
// (the header's progress), and node-pg's default of 10 capped the load test at
// about 35 pages a second over a 76 ms round trip to the database. The free
// Supavisor pooler accepts 200 clients, so 40 leaves room for several
// instances on Vercel plus the CLI (docs/load-test.md).
const POOL_MAX_CONNECTIONS = 40

function createClient(): PrismaClient {
	// Prisma 7 connects through a driver adapter. DATABASE_URL is the Supavisor
	// transaction pooler (port 6543), so serverless functions share a small
	// pool instead of each opening its own Postgres connections. TLS is
	// verified against the Supabase CA (src/server/db/tls.ts).
	const adapter = new PrismaPg({
		connectionString: process.env.DATABASE_URL,
		ssl: databaseSsl(process.env.DATABASE_URL),
		max: POOL_MAX_CONNECTIONS
	})
	return new PrismaClient({ adapter })
}

// Cache the client on globalThis outside production so hot-reload during
// `next dev` doesn't open a fresh connection pool on every file save.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }

export const db = globalForPrisma.prisma ?? createClient()

if (process.env.NODE_ENV !== 'production') {
	globalForPrisma.prisma = db
}
