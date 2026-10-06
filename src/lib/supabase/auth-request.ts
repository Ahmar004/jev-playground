import 'server-only'

// Supabase Auth limits sign-ins, sign-ups and token refreshes per IP address.
// Our server makes those calls (Server Actions and proxy.ts), so without this
// Supabase sees Vercel's few addresses and every visitor shares one small
// limit (ROADMAP Step-45). With "IP Address Forwarding" on in the project
// (Authentication > Rate Limits), Supabase counts the IP in this header
// instead, but only on a call made with the secret key. The key stays on the
// server: these clients are built only in server code and never reach a browser.
export const FORWARDED_FOR_HEADER = 'sb-forwarded-for'

export type AuthRequestKeys = { publishableKey: string; secretKey: string | undefined }
export type AuthRequestConfig = { key: string; headers: Record<string, string> }

/**
 * The API key and extra headers for a Supabase Auth call made for one visitor.
 * With no visitor IP (this machine's own runs) or no secret key, it is the
 * publishable key and no header, which is how every call worked before.
 */
export function authRequestConfig(ip: string | null, keys: AuthRequestKeys): AuthRequestConfig {
	if (!ip || !keys.secretKey) return { key: keys.publishableKey, headers: {} }
	return { key: keys.secretKey, headers: { [FORWARDED_FOR_HEADER]: ip } }
}
