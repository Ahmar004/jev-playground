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
export function databaseSsl(connectionString?: string): { ca: string } | false {
	if (isLoopbackDatabase(connectionString)) return false
	return { ca: readFileSync(SUPABASE_CA_PATH, 'utf8') }
}

const LOOPBACK_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]'])

/**
 * True for a database on this machine, such as the throwaway Postgres CI starts
 * (it has no TLS, and its traffic never leaves the machine). Anything else, or
 * a missing or unreadable URL, is remote and keeps verified TLS.
 */
export function isLoopbackDatabase(connectionString: string | undefined): boolean {
	if (!connectionString) return false
	try {
		return LOOPBACK_HOSTS.has(new URL(connectionString).hostname)
	} catch {
		return false
	}
}
