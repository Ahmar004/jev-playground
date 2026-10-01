import { existsSync } from 'node:fs'
import { sep } from 'node:path'
import { defineConfig } from 'prisma/config'
import { SUPABASE_CA_PATH } from './src/server/db/tls'

// Prisma 7 no longer reads env files. Load .env.local like Next.js does. A
// variable already set in the environment wins, which is how the migration
// scripts point the CLI at the database passed in --db-url.
if (existsSync('.env.local')) process.loadEnvFile('.env.local')

// The CLI connects with verified TLS, like the app (src/server/db/tls.ts):
// sslmode=require encrypts, sslcert is the CA the server certificate must
// chain to, and sslaccept=strict enforces that. Without it the CLI accepted a
// certificate from an unrelated CA in testing, so it must stay explicit.
function withTls(url: string | undefined): string | undefined {
	if (!url) return url
	const parsed = new URL(url)
	parsed.searchParams.set('sslmode', 'require')
	parsed.searchParams.set('sslcert', SUPABASE_CA_PATH.split(sep).join('/'))
	parsed.searchParams.set('sslaccept', 'strict')
	return parsed.toString()
}

export default defineConfig({
	schema: 'prisma/schema',
	migrations: { path: 'prisma/schema/migrations' },
	// The CLI migrates over the session connection (DIRECT_URL, port 5432): the
	// transaction pooler can't hold migrate's advisory lock. The app connects
	// through DATABASE_URL in src/server/db/client.ts, never through this file.
	datasource: { url: withTls(process.env.DIRECT_URL || process.env.DATABASE_URL) }
})
