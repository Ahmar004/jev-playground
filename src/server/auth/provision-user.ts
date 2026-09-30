import 'server-only'
import { db } from '@/server/db/client'

// Idempotent user provisioning — call on first sign-in / from an auth webhook
// with the Supabase auth uuid + email. It creates or refreshes the User row
// with id = the Supabase auth uuid (docs/rules/auth.md — never app-generated).
export async function provisionUser({ id, email }: { id: string; email: string }): Promise<void> {
	await db.user.upsert({
		where: { id },
		create: { id, email },
		update: { email }
	})
}
