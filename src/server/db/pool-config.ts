// How many database connections one server process may hold (ROADMAP Step-30).
// Locally one process serves every user, so a large pool keeps pages fast (the
// 1,000-user load test was capped by node-pg's default of 10). On Vercel every
// function instance opens its own pool, and the free Supabase pooler accepts
// only about 200 clients in total, so a large pool per instance would use them
// up during a traffic spike. The real Postgres connections behind the pooler
// are few anyway.
export const LOCAL_POOL_MAX = 40
export const VERCEL_POOL_MAX = 5
// On Vercel an idle connection is closed after this long, so an instance that
// goes quiet gives its pooler slots back quickly, and a new connection to the
// nearby database is cheap. Locally node-pg's default (10 s) stays: from a far
// machine a new connection costs about 0.6 s, which a 5 s timeout paid again
// after every pause between a user's clicks.
export const VERCEL_IDLE_TIMEOUT_MS = 5000

/** DATABASE_POOL_MAX if it is a positive whole number, else 5 on Vercel (which sets VERCEL) and 40 elsewhere. */
export function poolConnectionLimit(env: { VERCEL?: string; DATABASE_POOL_MAX?: string }): number {
	const configured = Number(env.DATABASE_POOL_MAX)
	if (env.DATABASE_POOL_MAX?.trim() && Number.isInteger(configured) && configured > 0) {
		return configured
	}
	return env.VERCEL ? VERCEL_POOL_MAX : LOCAL_POOL_MAX
}

/** The idle timeout in ms on Vercel; undefined elsewhere, which keeps node-pg's default. */
export function poolIdleTimeout(env: { VERCEL?: string }): number | undefined {
	return env.VERCEL ? VERCEL_IDLE_TIMEOUT_MS : undefined
}
