import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import type { AuthOnlySupabaseClient } from '@/lib/supabase/auth-only'

// Refreshes the Supabase session cookie on every page request.
export default async function proxy(request: NextRequest) {
	let supabaseResponse = NextResponse.next({ request })

	const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
	const supabasePublishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

	if (supabaseUrl && supabasePublishableKey) {
		// Typed to the auth surface like the wrappers in src/lib/supabase/ —
		// this is the one other place the SDK is constructed, and it exists
		// only to refresh the session cookie.
		const supabase: AuthOnlySupabaseClient = createServerClient(
			supabaseUrl,
			supabasePublishableKey,
			{
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
			}
		)

		// getClaims() verifies the session JWT locally against the project's
		// published signing keys (asymmetric keys, docs/api-setup-guide.md), and
		// refreshes an expired session, which may call Supabase. Never let that
		// take the site down: if Supabase is briefly unreachable the page still
		// serves, only without a refreshed session on this request.
		try {
			await supabase.auth.getClaims()
		} catch {
			// Fail open — see comment above.
		}
	}

	return supabaseResponse
}

export const config = {
	// Skip API routes, static files, and Next internals: only pages need the
	// session refreshed here.
	matcher: ['/((?!api|_next|_vercel|.*\\..*).*)']
}
