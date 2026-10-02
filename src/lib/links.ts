// Every in-app route (CLAUDE.md > UI rules). A route is added here in the
// slice that builds its page, so no link can point at a page that is missing.
export const ROUTES = {
	home: '/',
	signIn: '/sign-in',
	path: '/path',
	glossary: '/glossary',
	methodology: '/methodology',
	level: (levelId: string) => `/levels/${levelId}`,
	games: '/games',
	game: (gameId: string) => `/games/${gameId}`,
	leaderboard: '/leaderboard',
	arena: '/arena',
	arenaPreset: (presetId: string) => `/arena?preset=${presetId}`,
	sandbox: '/sandbox',
	share: (shareId: string) => `/s/${shareId}`
} as const

// Shared results (/s/<id>) are the only pages reachable without signing in
// (spec 5.1, R87).
export const SHARE_PATH_PREFIX = '/s/'

// The only external site levels link to for reading (R27, CLAUDE.md > UI rules).
export const TYPESAFE_DOCS_URL = 'https://docs.typesafe.ai'

export function typesafeDocsUrl(path: string): string {
	return `${TYPESAFE_DOCS_URL}${path}`
}
