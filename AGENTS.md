# This is NOT the Next.js you know

Next.js 16 and React 19 are the pinned versions in this template. Both have
real breaking changes vs. the v13/14 App Router conventions your training
data was likely written against — read `node_modules/next/dist/docs/` before
writing any code that touches routing, caching, or data fetching. In
particular:

- Every dynamic API is async now — `params`, `searchParams`, `cookies()`,
  `headers()`. The old synchronous access pattern is fully removed as of v16,
  not just deprecated.
- Caching is opt-in, not opt-out. Nothing is cached by default; use the
  `'use cache'` directive where you actually want caching. Don't assume a
  `fetch` call or a GET route handler is cached the way it was in v13/14.
- Turbopack is the default bundler for both `next dev` and `next build` —
  don't add webpack config assuming it's the active bundler.

## React and Next.js performance

- Treat performance as a correctness requirement for every React and Next.js
  change.
- Keep Client Component boundaries as small as possible; do data access and
  non-interactive rendering in Server Components.
- Start independent async work together and avoid request waterfalls. Reuse
  data already fetched instead of issuing duplicate count or aggregate
  queries.
- Do not add heavy client dependencies, barrel imports from large packages,
  or eager loading for features that are not needed on initial render.
- Avoid derived state in effects and repeated expensive work during renders.
  Memoize only genuinely expensive computations, use functional state updates
  when based on prior state, and keep effect dependencies primitive and
  narrow.
- React Compiler is enabled with `panicThreshold: 'all_errors'` (see
  `next.config.ts`) — a Compiler bailout fails the build, it does not
  silently skip optimization. Fix the underlying issue rather than routing
  around the Compiler.
- Before handing off a change, run ESLint, TypeScript, and a production
  Next.js build. Re-check the current guidance in
  `node_modules/next/dist/docs/` before using a Next.js API or convention.

## Engineering rules

Each of these is a short summary — read the linked file before touching
that area, don't rely on the summary alone. They're split into individual
files (not one long section here) so each stays independently readable and
linkable, the same way the org's other repos split topic-scoped rules out
of one monolithic instructions file.

- **[Database access](docs/rules/database.md)** — Prisma only, no raw
  SQL clients, no Supabase `.from()`/`.rpc()` for data.
- **[Migrations](docs/rules/migrations.md)** - migrations are generated
  locally from a schema diff by `scripts/generate-migration.mjs` and
  committed; never hand-write a file under `prisma/schema/migrations/`.
  One-off SQL that isn't a schema change (a data fix, reference rows, a
  view) goes in `prisma/run-once.sql`: `pnpm db:run-once` applies it once
  per database, after the migrations, tracked by content hash in the
  `_run_once_sql` ledger so it never repeats.
- **[Auth](docs/rules/auth.md)** — Supabase Auth by default for anything
  with real user accounts, removed entirely for landing pages; auth only,
  never a second path to application data. Authorization is enforced in the
  API/action layer (session + ownership guards) because Prisma connects
  directly, not through PostgREST. Keep the Supabase Data API **off**, and
  still enable RLS with **no policies** on every table — a deny-by-default
  lock so no anon/authenticated role can ever read a row, even if the Data
  API is switched on later. Don't `FORCE` it (Prisma connects as the table
  owner, which must stay exempt). `pnpm check:rls` reads the database to
  prove all three, and the Supabase wrappers are typed to their auth
  surface so a data call through them doesn't compile.
- **[State management](docs/rules/state-management.md)** — TanStack Query
  for server state, local state/URL params for client-only state, no
  global store by default.
- **[Error handling](docs/rules/error-handling.md)** — `AppError` for
  user-caused failures, `captureError`/`captureClientError` for everything
  else; never call Sentry or write a raw error into a response/UI directly.
- **[Logging](docs/rules/logging.md)** — shared Pino structured logger
  (`src/server/lib/logger`) for the record of what happened, server-only,
  redaction as a backstop; never `console.*`, and never a substitute for
  `captureError` (that's what Sentry is for).
- **[Secrets](docs/rules/secrets.md)** — credentials live in env vars read
  through `src/lib/env.ts`, never hardcoded or committed; a `check:secrets`
  scanner backstops it at the pre-commit hook and again in `local-review`,
  over source and over the `.claude-logs/` transcripts that ship on the
  branch. Redact a secret out of a transcript before logging the session —
  don't lean on the scanner.
- **[Analytics](docs/rules/analytics.md)** — PostHog through the typed
  taxonomy in `src/lib/analytics/` (`track`/`trackServer`), never
  `posthog.capture` directly; `object_action` snake_case past-tense names,
  ids/enums/booleans only, no PII or free text.
- **[Components](docs/rules/components.md)** — `src/components/ui/` is a
  small cva/Radix-based foundation (Button, Input, Card, toast system, ...),
  not a full suite; add to it deliberately rather than reaching for a new
  dependency.
- **[Icons](docs/rules/icons.md)** — every icon is imported from
  `@/components/ui/icons`, never from the provider package (Phosphor by
  default) directly; that one file wraps them, so swapping provider is a
  one-file change. Icons take no label prop — they render `aria-hidden`,
  and an icon-only button labels the button. ESLint fails the build on a
  direct provider import.
- **[Code style](docs/rules/code-style.md)** — formatting, naming
  conventions (camelCase/PascalCase/snake_case), Zod-everywhere API
  contracts, design-token usage.
- **[Code quality](docs/rules/code-quality.md)** — no `any`, no god files,
  DRY without premature abstraction, no magic numbers, logging discipline,
  docstrings that earn their keep.
- **[Feature approach](docs/rules/feature-approach.md)** — propose the
  80/20 slice for a brand-new feature and let the developer choose scope;
  prioritize test/edge-case coverage over scope-minimization once a
  feature already exists and you're adjusting it.
- **[Commits](docs/rules/commits.md)** - verify locally with
  `local-review` before committing (GitHub CI re-runs the same gates on every
  push, but this is the gate before a commit), plus Conventional Commits message format, enforced by a shared
  commit-msg hook.
- **[Pull requests](docs/rules/pull-requests.md)** — write the title and
  description last, once the work is actually done, not at PR-creation
  time when it can still change. Open as draft if you need a PR to exist
  before then.
- **[Deployment](docs/rules/deployment.md)** - the app runs on localhost
  only; never deploy.

`docs/STANDARDS.md` is the checklist of what every 8x repo carries — the
files, hooks, gates and config behind the rules above — paired with the
deterministic check that proves each item is still wired:
`pnpm check:standards` (`scripts/check-standards.mjs`), run by
`local-review` before every push. It is also the playbook for bringing an existing repo onto
these standards: point the script at that repo and its failures are the
to-do list.

## Per-tool entry points

This file is the source of truth for the engineering rules. Claude Code is
the only coding agent on this project, and `CLAUDE.md` imports this file and
adds the project's own rules. Engineering rules go here; project rules go in
`CLAUDE.md`.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
