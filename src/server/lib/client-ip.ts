import 'server-only'

// The machine's own address: a real visitor never has it, but the dev and local
// production servers report it, and the e2e suite signs in from it all day.
const LOOPBACK = new Set(['127.0.0.1', '::1', '::ffff:127.0.0.1'])

/**
 * The caller's IP as the platform reports it, or null when there is none (or it
 * is this machine's own). On Vercel `x-forwarded-for` is set by the platform, and
 * its first address is the client.
 */
export function clientIp(headers: Headers): string | null {
	const address =
		headers.get('x-forwarded-for')?.split(',')[0]?.trim() || headers.get('x-real-ip')?.trim()
	return address && !LOOPBACK.has(address) ? address : null
}
