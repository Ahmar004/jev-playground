# Deployment

Jev's Playground runs on localhost only (spec R95). Never deploy it: no
`vercel`, no `supabase functions deploy`, no hosting of any kind, unless the
user explicitly asks. There is no production or staging environment, and the
GitHub repo is owned by 8x, so a deploy has nowhere legitimate to go.

GitHub CI is disabled. `.github/workflows/ci.yml` stays in the repo because
`pnpm check:standards` reads it, but nothing runs it; the `local-review`
skill runs the same gates on this machine before every commit and push.

Database changes are applied locally too: see `docs/rules/migrations.md`.
