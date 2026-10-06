@AGENTS.md

# Jev's Playground - Claude Code rules

Keep sessions short: one ROADMAP step per session, and save progress and hand-off context to `docs/progress.md` before ending (ROADMAP Rule-6). Long sessions fill the context window and quality drops.

`AGENTS.md` above is the template's index of generic engineering rules (`docs/rules/`). This file holds the rules specific to this project. Claude Code is the only coding agent here, so new project rules go in this file, not in `AGENTS.md`. If this file and a `docs/rules/` file disagree, stop and ask the user.

## What this project is

Jev's Playground is an interactive website that teaches where System One models like Jev work well, where they break, and where a frontier LLM or plain code is the better tool. It teaches through levels, games, an Arena, a Sandbox and quizzes, in Beginner mode (replays of real recordings, no keys) and Developer mode (live calls with the user's own keys). It runs on localhost until the Vercel deploy (ROADMAP Step-29), and then launches to TypeSafe's Discord community (100k+ people), so it must be fast, scalable, reliable and secure (Rule-0.01).

## Stack and commands

Next.js 16 App Router (React 19, TypeScript strict) for frontend and backend; Supabase Postgres and Auth, reached only through Prisma 7; Tailwind v4 tokens, Radix, Motion, dnd-kit, hand-built SVG charts, canvas-confetti and next-themes; plain `fetch` plus Zod per provider; Vitest, Playwright, k6, Sentry, PostHog and Pino. `TECH-STACK.md` gives the reasons. Ask before adding a library it doesn't name.

`pnpm` is not on PATH on this machine, so run every script as `corepack pnpm <script>`.

| Command                                                         | What it does                                                                                                                              |
| --------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `dev` / `build` / `start`                                       | Dev server; production build; serve the build on localhost.                                                                               |
| `lint` / `typecheck`                                            | ESLint with zero warnings; `tsc --noEmit`.                                                                                                |
| `format` / `format:check`                                       | Prettier write / check.                                                                                                                   |
| `test` / `test:e2e`                                             | `node:test` suites, then Vitest; Playwright e2e.                                                                                          |
| `check:env` / `check:secrets` / `check:standards` / `check:rls` | Env vars documented; no secrets in source or logs; 8x standards wired; RLS on with no policies.                                           |
| `record`                                                        | Record Jev and the three Claude models for tasks whose content changed (`--task`, `--model`, `--dry-run`). Costs money; dry-run first.    |
| `load:session` / `load`                                         | k6 load test against `pnpm start` (R78); needs k6 installed. Writes `load/results-<users>.json` for Methodology. See `docs/load-test.md`. |
| `prisma:generate` / `db:run-once`                               | Regenerate the Prisma client; apply `prisma/run-once.sql` once per database.                                                              |

`test` runs the template's `node:test` suites first (`check:standards` requires them, for the logger contract tests) and then `vitest run`. For Vitest alone, run `corepack pnpm exec vitest`.

Prisma 7 reads its CLI settings from `prisma.config.ts`, which loads `.env.local` and migrates over `DIRECT_URL`. The generated client lives in `src/server/db/generated/`, which is gitignored and rebuilt by `prisma:generate` (postinstall runs it).

## Source of truth

- Follow `ROADMAP.md` at all costs. It sets the order of work: one step at a time, unless the user asks for several at once. Don't edit it without the user's approval of the exact change (Rule-0). Don't start a later step or invent a new one; propose it in `ROADMAP.md` and wait for approval (Rule-4).
- Which doc answers what. Read the relevant section before starting a task.
  - `spec.md`: what we build, with `[R#]` tags. It replaces `docs/requirements.md`, which is the verbatim brief kept as an archive.
  - `TECH-STACK.md`: what we build it with (Step-1).
  - `DESIGN.md`: how each feature is built, the screens, and the slice plan (Step-3).
  - `docs/progress.md`: what is done, and the hand-off to the next step.
  - `docs/api-setup-guide.md`: how to set up each external API and service, and which `.env.local` values it gives. Add a service's section in the same step that adds the service (Rule-10).
- Don't invent requirements. A decision these docs don't settle is an open question for the user. Where they are silent on how something looks or behaves, follow the existing screens and design tokens.
- Keep `ROADMAP.md`, this file, `spec.md`, `TECH-STACK.md` and `DESIGN.md` consistent (Rule-3). When one changes, check the others.
- Docs at the repo root: `ROADMAP.md`, `CLAUDE.md`, `AGENTS.md`, `spec.md`, `TECH-STACK.md`, `DESIGN.md`, `README.md`, `CONTRIBUTING.md` (the owner asked for it at the root, where GitHub links it) and `CAPTURE-TEST.md` (required by 8x). Every other doc goes in `docs/`.

## Time budget and right-sizing

- There is no deadline now (Rule-1), but ship each step fast. The remaining project budget is 10,000 PKR (Rule-0.3), and all Anthropic spend, every Recording included, stays within the $20 credit on the owner key (Rule-0.1); the top of `ROADMAP.md` holds the current balances. There is no top-up, so dry-run every recording first and record only what changed. Build complete, working flows before polish (spec 15). Flag early any requirement that puts the budget at risk.
- No custom domain is bought for now: the app is served at its free `vercel.app` URL, so nothing may depend on owning a domain (an email sender of our own, password reset emails).
- Save tokens (Rule-0.0): at a session start read only the "Current state" block of `docs/progress.md` and the doc sections the step needs; find headings with grep before reading a whole file.
- Size each solution to its problem. When a simple solution fully solves the problem, use it, and don't build for needs we only foresee (YAGNI, `docs/rules/feature-approach.md`). When no simple solution solves it, build what the problem actually needs. A simple fix that leaves the problem unsolved, or solves it the wrong way, is not simpler.
- Every dependency and service must be free or fit the remaining 7000 PKR budget. Ask before adding anything that needs a paid plan or billing details.

## Writing rules (code, UI copy, commits and docs)

- No emojis anywhere: not in code, comments, commit messages or UI. Icons come from `@/components/ui/icons`.
- No long dashes. Use a single hyphen "-" wherever a dash is needed.
- Don't bloat docs. Every line must prevent a concrete mistake or answer a real question. In docs, state the claim, then the reason behind it, in plain sentences.
- Use the vocabulary in spec 1.2 (Jev, LLM, Code, State, Question, Noul, Choice, Score, Confidence, Beginner mode, Developer mode, Recording, Level, Game, Arena, Sandbox, Racer) and don't invent synonyms. Enum-like values (modes, providers, question kinds, level status) come from one constants module, never inline literals.

## Product guardrails

These restate spec rules that code can break silently. The spec section holds the full rule.

- Keys (Rule-8, spec 4): a user's API key lives only in the tab's memory. Never write one to local storage, session storage, cookies, IndexedDB, the database, a log, analytics, Sentry or a URL. Google keys go in the `x-goog-api-key` header, never in `?key=`. TypeSafe-key calls go through our server pass-through, which stores and logs neither the key nor the request body. Owner recording keys live only in `.env.local` and never reach the browser.
- Honesty (spec 3.2, 12.4): recordings are real outputs, never invented, edited or hand-tuned. Replays animate at the recorded latency. Every result shows its mode label, model ID, and recording date or run time. Never remove the mode disclosure (R84).
- One runner (R92): the recording CLI and Developer mode share one runner for tasks, provider calls, parsing, scoring and cost. Views display its numbers and never compute scores or cost themselves. Cost is token counts times the stored price, and the price used is saved with the result.
- An LLM output that can't be parsed counts as a miss and is shown, never hidden (R44).
- User text and model output render only as plain text, never as HTML: no `dangerouslySetInnerHTML` (R86).
- No dummy data (Rule-5). Every level, game, preset and quiz item is real content with real recorded results.
- Shared result pages are read-only and not indexed (R87). They are the only pages reachable without signing in.

## UI rules

- Build screens from the design tokens in `src/app/globals.css` and the primitives in `src/components/ui/` before adding anything new.
- Every visible control works. No dead links, placeholder buttons or fake states, and no UI copy that promises something the app doesn't do.
- In-app routes live in one links constants module. Add a nav link only when its page exists. External links go only to TypeSafe docs (R27) and provider key pages (R19).
- Actions feel instant: optimistic updates that roll back on failure, a toast confirming each action, and skeletons for data that streams in. Long runs show progress so the site never looks frozen (R80).
- One fluid, desktop-first layout with no fixed minimum width and no separate mobile component trees. It scales down to phones, and the phone UI must stay easy to navigate and as polished as desktop (R73).
- Forms and dialogs: Enter submits, Esc cancels. Use a real `<form onSubmit>` with `event.preventDefault()`, `type="submit"` on the primary button and `type="button"` on every other button.
- Animations use Motion inside `LazyMotion` with `MotionConfig reducedMotion="user"`. Drag-and-drop uses dnd-kit plus tap buttons. Charts are hand-built SVG components, not a chart library.
- Accessibility (spec 12.3): WCAG 2.1 AA in both themes, visible focus states, labelled inputs, keyboard and touch alternatives to every drag-and-drop, color never the only signal, and animations that respect reduced motion. Every screen has meaningful empty, loading and error states.

## Architecture

- No data fetching, timers or business logic inside UI components. Put them in hooks or controllers, keep components pure (data in through props, actions out through callbacks), and lift shared state to the nearest common parent.
- Database access goes only through Prisma (`docs/rules/database.md`), behind server-side data functions. Pages and components never import the database client.
- Every signed-in UI decision comes from one session object. The UI alone never authorizes: every read or write of a user-owned row (progress, quiz attempts, XP, badges, leaderboard entries, shares) checks ownership on the server against the session (`docs/rules/auth.md`).
- Provider calls go through one module per provider, shared by the browser and the recording CLI, with shapes that match the real API payloads. They use plain `fetch` plus Zod, never a provider SDK: we time exactly one request with no hidden retries, so latency stays honest (R7).
- Content and Recordings are versioned JSON under `content/`, validated with Zod at build. Beginner mode reads only these files, never the database or a model API (R76). Only the recording CLI writes them.
- Keys live in one React context in tab memory. Never put a key in a TanStack Query key, a URL, an error message or an analytics property.
- Shared code follows the Rule of Three (`docs/rules/code-quality.md`).

## Rendering and caching (Next.js 16 Cache Components)

`cacheComponents: true` is on (Step-5 enables it), so nothing is cached unless the code asks. `TECH-STACK.md` > Rendering strategy says which pages are SSG, PPR, CSR or cached SSR.

- Content from `content/` is imported, not fetched, so it renders at build time.
- Per-user data (session, progress, XP, leaderboard) never goes inside `'use cache'`. It is read in a component wrapped in `<Suspense>` with a skeleton fallback, so the static shell paints first. `cookies()`, `headers()`, `params` and `searchParams` are async and also go under `<Suspense>`.
- Use `'use cache'` only for data that is the same for every viewer, and always pair it with `cacheLife` and `cacheTag`. A cached function can't read cookies or headers, even through a helper; read them outside and pass the values in.
- After a write in a Server Action, call `updateTag` so the user sees the change at once. `revalidateTag(tag, 'max')` serves stale content once more, so it is only for Route Handlers where that is fine. The shared result page reads its row on every request and never caches it, because a cached read (`'use cache'` plus `updateTag`) still served a deleted share once more in a production build, and R87 needs the link dead at once.
- `Math.random()`, `Date.now()` and `crypto.randomUUID()` in a Server Component need `await connection()` first, or prerendering fails.

## Workflow

- Ask, don't assume. On any confusion or important decision, ask through the AskUserQuestion tool and keep asking follow-up rounds until every open point is resolved. Don't end a turn with questions asked only in prose.
- Invoke the skill a ROADMAP step names before starting that step, and say which skill is in use. The superpowers skills (brainstorming, writing-plans, test-driven-development, subagent-driven-development, systematic-debugging) are installed but not listed in the session, so read `~/.claude/plugins/cache/claude-plugins-official/superpowers/<version>/skills/<name>/SKILL.md` and follow it by hand.
- Testing: write tests first (TDD) for the runner, parsing, scoring, cost math, key handling, API routes, server actions and hooks. Check presentational components with screenshots in both themes at desktop and phone widths. Every user flow gets a Playwright e2e test. App tests run in Vitest; the template's `node:test` stays only for its `scripts/*.test.mjs` and `src/**/*.test.mts` tests, and `pnpm test` runs both.
- Subagents (Step-6): Opus 5.5 for the main agent, Sonnet 5.5 for subagents, at most one subagent at a time.
- Git: one commit per finished slice, with a Conventional Commits message (`docs/rules/commits.md`). Run the `local-review` skill before every commit and push; GitHub CI (on since Step-22) re-runs the gates on every push, but `local-review` stays the gate before a commit. Never commit `.env.local` or any secret.
- Once a step changes what is built, how to run it or a known gap, update `README.md` in the same step.
- Use current docs, not memory. Next.js 16 ships its docs in `node_modules/next/dist/docs/`; for any other library or API, fetch its current docs.
- To check, debug or verify anything on localhost, use the Claude-in-Chrome extension (ROADMAP Rule-11).
- Ask questions with full context, never briefly: say exactly where to look (our app on localhost, or an external site such as sentry.io or posthog.com, with the URL and the click path), what to look for, and what each answer means (ROADMAP Rule-0.2).
- On this Windows machine, use `python`, not `python3`.

## Known pitfalls

Each of these cost a past session time; `docs/progress.md` has the details.

- The dev server can hit a Turbopack panic (exit 0xc0000142) on this machine, so run e2e against a production build: `corepack pnpm build`, `corepack pnpm start`, then e2e with `E2E_BASE_URL`. A `pnpm start` server serves the last build, so UI changes need a rebuild first.
- To verify without disturbing a `pnpm start` that must keep running (for example a tab that holds keys in memory), build into another folder: `NEXT_DIST_DIR=.next-verify corepack pnpm build`, serve it with `NEXT_DIST_DIR=.next-verify corepack pnpm exec next start -p 3100`, and run e2e with `E2E_BASE_URL=http://localhost:3100`. Next then adds `.next-verify` paths to `tsconfig.json`; revert that with `git checkout tsconfig.json`. `next dev -p 3100` also coexists with `next start` (Next 16 keeps dev output in `.next/dev`).
- Stop `pnpm start` before `build`, because the build replaces `.next` under the running server. Stopping `pnpm dev` through `TaskStop` leaves node on port 3000, so free the port (`Get-NetTCPConnection -LocalPort 3000`) before starting another server.
- A level page that renders blank in dev usually means a crashed static-params worker: restart `pnpm dev`.
- Localhost has an IP: the dev and local production servers send `x-forwarded-for: ::1`. `clientIp` ignores loopback addresses on purpose, so IP rate limits never hit local runs or e2e; the per-email sign-in limit (10 per 15 min) still does.
- Next.js loads `.env.production.local` (and `.env.production`) for every `next build` and `next start`, so a file with the production database's values must never have that name. Production values live in `.env.prod-values.local`, which nothing loads; use it only by sourcing it into the shell for one command (migrations, `check:rls`).
- Supabase rate-limits sign-ins and sign-ups (about 30 per 5 minutes per IP). `e2e/helpers.ts` keeps each email's session cookies after the first sign-up or sign-in, so `signIn(page, email)` only signs in for real once per email in a worker; pass `{ fresh: true }` for a test of signing in itself or after a sign-out. A cluster of `toHaveURL('/')` failures still means the limit was hit: wait a few minutes.
- Run `corepack pnpm exec next typegen` after adding a route if `PageProps<...>` types fail in typecheck.
- Python `open(..., 'w')` writes CRLF on Windows; pass `newline=''` when a script edits files.
- Run the k6 load test on an otherwise idle PC; a build or the test suite running alongside skews it. k6 is not on PATH: `winget install k6 --source winget`.
- next-themes ignores the emulated color scheme. In e2e use `setColorScheme(page, scheme)` before navigating (it sets the `theme` local storage key) and `captureScheme(page, scheme, options)` for a themed screenshot (it checks the html class, then waits 1.5 s for the rise-in animation). Don't use it in a test that reloads and expects its own theme choice to persist.

## Session logs

`.claude-logs/` is tracked, never gitignored: the transcript for the session that produced a change ships on the same branch. Commit it as its own `chore(logs)` commit right after the code commit, and push both together. Always commit `.claude-logs/` with your changes.

Never edit, tidy or delete a log entry. The one exception: redact a secret out of a transcript before committing it (`docs/rules/secrets.md`).

Capture is automatic: user-level `UserPromptSubmit` and `Stop` hooks in `~/.claude/settings.json` run `~/.claude/extract-log.py`, which writes only prompts and final replies (no tool calls). Setup and proof are in `CAPTURE-TEST.md`; the guide is `docs/agent-session-logs-setup.md`.

## Skills

See `.claude/skills/*/SKILL.md` for full detail. In short:

- `dev-onboarding`: get a local environment running on this project.
- `local-review`: before every commit and push. the gate before a commit; GitHub CI re-runs the same gates on every push (`docs/rules/commits.md`).
- `typesafe`: audits the type assertions this branch introduced (the no-`any` rule, `docs/rules/code-quality.md`). Despite the name, it has nothing to do with TypeSafe, Jev's maker.
- `e2e-review`: before pushing a UI or flow change.
- `dogfood`: exploratory QA of the running app (Step-7).
- `local-feature-testing`, `sql-preview`, `seed-for-pr` (test fixtures only, never product data, ROADMAP Rule-5).
- `create-issue`: file work as a GitHub issue instead of doing it now.
- `posthog-funnel-builder`: build a PostHog funnel from the events the code fires.

## Local now, Vercel later

The app is live on Vercel at https://letsplaywithjev.vercel.app (free `vercel.app` URL, project `ahmar9/jev-playground`, spec R95), backed by the production Supabase project. This repo is the owner's personal repo. Deploy only when the owner asks, and only to Vercel (ROADMAP Rule-9, `docs/rules/deployment.md`). Local runs stay on the dev database. Everything must run on Vercel unchanged:

- No file writes at runtime. Recordings are build-time JSON that only the local CLI writes.
- No state kept in one process's memory. Rate limits and counters live in Postgres.
- Pooled database connections: `DATABASE_URL` through the Supavisor pooler (port 6543), migrations over `DIRECT_URL` (port 5432).

Prisma migrations are generated and applied locally against our database (`pnpm exec prisma migrate deploy`, then `node scripts/generate-migration.mjs --name <name> --db-url <url>`), as 8x confirmed. The full flow is in `docs/rules/migrations.md`.
