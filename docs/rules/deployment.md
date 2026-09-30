# Deployment

Jev's Playground runs on localhost only for now (spec R95). Never deploy it
from this repo: no `vercel`, no `supabase functions deploy`, no hosting of any
kind, unless the user explicitly asks. The GitHub repo is owned by 8x, so a
deploy has nowhere legitimate to go.

Build everything so it could deploy to Vercel unchanged later, from the
owner's personal repo (ROADMAP Rule-9): no runtime file writes, no state kept
in one process's memory, pooled database connections. `TECH-STACK.md` >
Vercel readiness lists the rules.

GitHub CI is disabled. `.github/workflows/ci.yml` stays in the repo because
`pnpm check:standards` reads it, but nothing runs it; the `local-review`
skill runs the same gates on this machine before every commit and push.

Database changes are applied locally too: see `docs/rules/migrations.md`.
