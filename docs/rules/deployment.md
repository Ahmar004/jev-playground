# Deployment

Jev's Playground runs on localhost until ROADMAP Step-29 deploys it to Vercel
at its free `vercel.app` URL (spec R95). No custom domain is bought for now.
This repo is the owner's personal repo. Deploy only inside that step, or when
the owner explicitly asks, and only to Vercel: no `supabase functions deploy`
and no other hosting.

Build everything so it runs on Vercel unchanged (ROADMAP Rule-9): no runtime
file writes, no state kept in one process's memory, pooled database
connections. `TECH-STACK.md` > Vercel readiness lists the rules.

GitHub CI is disabled until ROADMAP Step-22. `.github/workflows/ci.yml` stays
in the repo because `pnpm check:standards` reads it, but nothing runs it yet;
the `local-review` skill runs the same gates on this machine before every
commit and push, and stays the gate after CI is on.

Database changes are applied locally too: see `docs/rules/migrations.md`.
