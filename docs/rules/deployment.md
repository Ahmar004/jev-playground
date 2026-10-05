# Deployment

Jev's Playground runs on localhost until ROADMAP Step-29 deploys it to Vercel
at its free `vercel.app` URL (spec R95). No custom domain is bought for now.
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

Database changes are applied locally too: see `docs/rules/migrations.md`.
