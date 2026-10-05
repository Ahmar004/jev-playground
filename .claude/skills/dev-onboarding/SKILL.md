---
name: dev-onboarding
description: Get a new developer's local environment running on this project. Walks through install, env vars, migrations, and confirming the dev server actually boots. Use when the user says "/dev-onboarding", "I just joined this project", "get my local env running", "set up my machine for this repo", or is new to this repo.
---

# Dev onboarding

For a developer who has clone/pull access to this project and needs to get
productive locally. The app runs on localhost only (`docs/rules/deployment.md`).

## 1. Install

```bash
pnpm install
```

This does two things beyond installing packages, both automatic — nothing
else to run by hand:

- Installs the commit-msg git hook (`prepare` script) — Conventional
  Commits get enforced locally, not just in CI.
- Regenerates the Prisma client (`postinstall` script) — you never need to
  run `prisma generate` yourself after a fresh install.

## 2. Environment variables

```bash
cp .env.example .env.local
```

Every variable in `.env.example` has an inline comment explaining what
it's for. You'll need real values for at minimum:

- `DATABASE_URL` / `DIRECT_URL` — ask a teammate for the shared dev
  database, or provision your own local Postgres.
- `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` /
  `SUPABASE_SECRET_KEY` — **only if this project has Supabase Auth**
  (check for `src/lib/supabase/` — if it's absent, this project removed
  auth per `docs/rules/auth.md` and these don't apply to it). Get real
  values from the project's Supabase dashboard (Settings → API) or a
  teammate.

Sentry/PostHog vars can stay empty locally — both no-op gracefully. Don't
spend time chasing real values for these unless you're specifically
testing observability.

Run `pnpm check:env` after filling in `.env.local` — it won't validate the
_values_, but it confirms nothing the app actually reads is missing.

## 3. Database

```bash
pnpm exec prisma migrate deploy
pnpm db:run-once
```

The first applies every committed migration; the second applies
`prisma/run-once.sql`, the current one-off, if this database hasn't had it
yet — a ledger keyed by content hash makes it safe to run any time (see
`docs/rules/migrations.md`). It's a no-op while the file is empty. Never
`prisma migrate dev` against a shared database (same doc) — `migrate dev` is
for authoring a new schema change, not for catching an existing database up
to what's already committed.

## 4. Boot it

```bash
pnpm dev
```

Open the URL it prints. If this fails, work through it in
order: env vars first (the most common cause), then whether migrations
actually applied, then whether `node_modules` is stale
(`rm -rf node_modules && pnpm install`).

## 5. Before your first commit

Read `AGENTS.md` — a short index into `docs/rules/*.md` covering database
access, migrations, auth, state management, code style, code quality,
feature approach, commits, pull requests, and deployment. Read
`docs/rules/commits.md` and `docs/rules/pull-requests.md` specifically
before you push anything: **don't commit once per fix while iterating**,
and don't write a PR's real title/description until the work is actually
done (open it draft if it needs to exist earlier) — run `local-review`
before committing. GitHub CI re-runs the same gates on every push, but `local-review` is the gate before a commit.
