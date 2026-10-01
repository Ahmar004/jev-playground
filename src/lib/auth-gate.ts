import { ROUTES, SHARE_PATH_PREFIX } from './links'

// The proxy's whole decision, kept pure so it can be tested without a
// request. Returns where to redirect, or null to let the request through.
export function gateRedirect(pathname: string, signedIn: boolean): string | null {
	const isPublic = pathname === ROUTES.signIn || pathname.startsWith(SHARE_PATH_PREFIX)
	if (!signedIn && !isPublic) return ROUTES.signIn
	if (signedIn && pathname === ROUTES.signIn) return ROUTES.home
	return null
}
