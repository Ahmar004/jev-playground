# Deployment

Jev's Playground is deployed to Vercel at its free `vercel.app` URL (ROADMAP
Step-29, spec R95); the project is `ahmar9/jev-playground`, its function region
is pinned to `iad1` in `vercel.json`, and its setup is section 6 of
`docs/api-setup-guide.md`. No custom domain is bought for now.
This repo is the owner's personal repo. Deploy only inside that step, or when
the owner explicitly asks, and only to Vercel: no `supabase functions deploy`
and no other hosting.

Build everything so it runs on Vercel unchanged (ROADMAP Rule-9): no runtime
file writes, no state kept in one process's memory, pooled database
connections. `TECH-STACK.md` > Vercel readiness lists the rules.

GitHub CI has run `.github/workflows/ci.yml` on every push since ROADMAP
Step-22 (check, build, a throwaway-Postgres migrations replay with the RLS
check, and the commit-message check on PRs). It has no e2e job: the Playwright
suite needs real Supabase credentials, which CI must not hold. The
`local-review` skill runs the same gates on this machine before every commit
and push, and stays the gate.

Database changes are applied from this machine, to the dev database and then
to the production one with its own values (`.env.prod-values.local`, loaded for
the command only): see `docs/rules/migrations.md` and the "Production project"
section of `docs/api-setup-guide.md`. Vercel's build never runs migrations.
