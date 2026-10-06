import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { gateRedirect } from '@/lib/auth-gate'
import type { AuthOnlySupabaseClient } from '@/lib/supabase/auth-only'
import { authRequestConfig } from '@/lib/supabase/auth-request'
import { clientIp } from '@/server/lib/client-ip'

// Refreshes the Supabase session cookie on every page request, then gates
// the page: signed-out visitors go to /sign-in (DESIGN 11.5). This check is
// optimistic; every read and write re-checks the session on the server.
export default async function proxy(request: NextRequest) {
	let supabaseResponse = NextResponse.next({ request })
	let signedIn = false

	const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
	const supabasePublishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

	if (supabaseUrl && supabasePublishableKey) {
		// A refresh carries the visitor's IP, so Supabase's per-IP token limit
		// counts each visitor, not this server (src/lib/supabase/auth-request.ts).
		const { key, headers } = authRequestConfig(clientIp(request.headers), {
			publishableKey: supabasePublishableKey,
			secretKey: process.env.SUPABASE_SECRET_KEY
		})
		// Typed to the auth surface like the wrappers in src/lib/supabase/.
		const supabase: AuthOnlySupabaseClient = createServerClient(supabaseUrl, key, {
			global: { headers },
			cookies: {
				getAll() {
					return request.cookies.getAll()
				},
				setAll(cookiesToSet) {
					cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
					supabaseResponse = NextResponse.next({ request })
					cookiesToSet.forEach(({ name, value, options }) =>
						supabaseResponse.cookies.set(name, value, options)
					)
				}
			}
		})

		// getClaims() verifies the JWT locally against the project's signing
		// keys and refreshes an expired session. If Supabase is unreachable the
		// visitor counts as signed out: sign-in is public, so this can't loop.
		try {
			const { data } = await supabase.auth.getClaims()
			signedIn = Boolean(data?.claims.sub)
		} catch {
			signedIn = false
		}
	}

	const target = gateRedirect(request.nextUrl.pathname, signedIn)
	if (!target) return supabaseResponse

	// Carry any refreshed session cookies onto the redirect.
	const redirect = NextResponse.redirect(new URL(target, request.url))
	supabaseResponse.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie))
	return redirect
}

export const config = {
	// Skip API routes (each handler returns its own JSON 401), static files
	// and Next internals.
	matcher: ['/((?!api|_next|_vercel|.*\\..*).*)']
}
