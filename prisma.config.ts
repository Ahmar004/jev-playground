import { existsSync } from 'node:fs'
import { defineConfig } from 'prisma/config'

// Prisma 7 no longer reads env files. Load .env.local like Next.js does. A
// variable already set in the environment wins, which is how the migration
// scripts point the CLI at the database passed in --db-url.
if (existsSync('.env.local')) process.loadEnvFile('.env.local')

export default defineConfig({
	schema: 'prisma/schema',
	migrations: { path: 'prisma/schema/migrations' },
	// The CLI migrates over the session connection (DIRECT_URL, port 5432): the
	// transaction pooler can't hold migrate's advisory lock. The app connects
	// through DATABASE_URL in src/server/db/client.ts, never through this file.
	datasource: { url: process.env.DIRECT_URL || process.env.DATABASE_URL }
})
