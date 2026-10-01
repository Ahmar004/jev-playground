import { readFileSync } from 'node:fs'
import { join } from 'node:path'

// Supabase's public root CA (docs/api-setup-guide.md > Secure the database
// connection). Supabase signs its database certificates with its own CA, which
// Node doesn't trust by default, so without this a connection either fails
// verification or falls back to plain text and sends the password unencrypted.
// next.config.ts ships the file with the server functions.
export const SUPABASE_CA_PATH = join(process.cwd(), 'prisma', 'prod-ca-2021.crt')

// TLS options for the pg driver: encrypted, with the server certificate and
// host name verified against the Supabase CA. Shared by the app's Prisma
// client and the database scripts.
export function databaseSsl(): { ca: string } {
	return { ca: readFileSync(SUPABASE_CA_PATH, 'utf8') }
}
