// Every in-app route (CLAUDE.md > UI rules). A route is added here in the
// slice that builds its page, so no link can point at a page that is missing.
export const ROUTES = {
	home: '/',
	signIn: '/sign-in',
	glossary: '/glossary'
} as const

// Shared results (/s/<id>) are the only pages reachable without signing in
// (spec 5.1, R87).
export const SHARE_PATH_PREFIX = '/s/'
