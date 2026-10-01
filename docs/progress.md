# Progress

## Step-0 - Agent capture setup (2026-09-30) - done

- Session logging is installed at user level: `~/.claude/extract-log.py` plus `UserPromptSubmit`/`Stop` hooks in `~/.claude/settings.json`. It writes to `.claude-logs/` in the repo. Details, Windows fixes and canary proof are in `CAPTURE-TEST.md`.
- `CLAUDE.md` > Session logs now carries the guide's line "Always commit `.claude-logs/` with your changes."
- `.claude-logs/` also holds 14 older logs that came with the 8x template (Aug-Sep 2026). They are not ours; Step-0.2 decides whether to keep them.
- Context for later steps: `python3` doesn't work on this machine (use `python`). `gh` is installed and logged in as `Ahmar004`, so logs show `github_user: Ahmar004`.
- ROADMAP Step-0 wording was changed from `.agent-logs/` to `.claude-logs/` (user-approved).
- A push to `main` triggers `.github/workflows/ci.yml` and `deploy-migrations.yml`.

Next: Step-0.1 (brainstorming -> spec.md).

## Step-0.1 - spec.md (2026-10-01) - done, approved by user

- `spec.md` at root now replaces `docs/requirements.md`. Every requirement keeps its number as an `[R#]` tag (all R0-R98 are traced). It covers what we build only; how we build it is left to Step-1 and Step-3.
- The superpowers plugin is installed, but its skills aren't listed in the session, so the brainstorming skill was read from `~/.claude/plugins/cache/claude-plugins-official/superpowers/6.3.0/skills/brainstorming/SKILL.md` and followed by hand. Later steps can do the same for writing-plans and the other skills.
- Findings from probing the providers (spec section 2.3): TypeSafe blocks browser calls, so TypeSafe-key Jev calls need a server pass-through. OpenRouter, Anthropic, OpenAI and Google all accept direct browser calls.
- User decisions: spec section 16. Items handed to later steps: spec section 17 (password reset/email, the recording cost estimate, preset content, XP and badges, colors).
- The user added ROADMAP Rule-8 this session: API keys never go to browser storage.
- **CI is disabled on GitHub** at the user's request (`gh workflow disable CI`; turn it back on with `gh workflow enable CI`). `Deploy migrations` was already disabled; `Claude PR review` is still active but only runs on PRs.
  - Why CI failed on every push since the initial commit: only the `pnpm format:check` step (Prettier) failed, on our markdown docs (`CAPTURE-TEST.md`, `docs/agent-session-logs-setup.md`, `docs/requirements.md`, `inspiration-Claude.md`, `ROADMAP.md`, `TECH-STACK.md`). Lint and typecheck passed.
  - The fix, when we turn CI back on: run `pnpm prettier --write` on those docs, or add them to `.prettierignore`. Step-0.2 should decide which and when CI comes back on.

Next: Step-0.2 (template analysis -> to-discard.md). Read `spec.md` first; it replaces `docs/requirements.md`.

## Step-0.2 - template analysis (2026-10-01) - done, edits approved by user

- `to-discard.md` at root lists 10 groups for Step-0.4 to remove, each with its follow-up edits: admin RBAC, DB feature flags, the AI usage ledger (MOAD), next-intl, Slack and cron, the analytics demo, Vercel/remote-CI files and skills, the Codex/Gemini/Qwen/Cursor files, one-time template tooling, and the 7 unapplied template migrations. Nothing is deleted yet.
- User decisions:
  - Recording is a local CLI (`pnpm record`), checked by playing in Beginner mode on localhost, so there's no admin web page and no RBAC.
  - Our database and services are the user's own free accounts; 8x provides only the GitHub repo (Step-1 confirms Supabase).
  - Keep Sentry and PostHog. Drop next-intl.
  - CI stays disabled and `local-review` is the gate.
  - Claude Code is the only agent.
  - Reset the template migrations; 8x confirmed migrations are generated and applied locally.
  - DESIGN.md merges into the Step-3 doc.
  - `docs/requirements.md` stays as an archive.
- Approved edits made:
  - TECH-STACK.md: "Carried over from the 8x template" section.
  - CLAUDE.md: trimmed Skills list, new "Local only" section, /cicd Commands section removed.
  - ROADMAP.md: the intro points to spec.md; Step-0.4, Step-3, Step-5 and Step-6 got one sentence each.
  - spec.md: §3.3 recording CLI and shared runner, §4 key scrubbing in Sentry/PostHog/logs, §14 R95 wording.
- Pitfall for later: Gemini accepts `?key=` in the URL, and Sentry breadcrumbs record URLs, so Google keys must go in the `x-goog-api-key` header.
- Pitfall for later: CLAUDE.md and AGENTS.md still mention the discarded parts (AGENTS.md rule bullets, per-tool list, CI_CD_SETUP). Step-0.4 removes those references together with the files.

Next: Step-0.3 (CLAUDE.md review against spec.md, ROADMAP.md, TECH-STACK.md and inspiration-Claude.md).

## Step-0.3 - CLAUDE.md review (2026-10-01) - done, approved by user

- `CLAUDE.md` is rewritten as the home for this project's rules. Claude Code is the only agent, so new project rules go there, not in `AGENTS.md`; a conflict with `docs/rules/` means ask the user. It keeps `@AGENTS.md` on line 1, which `check:standards` requires.
- New sections, adapted from `inspiration-Claude.md`:
  - Source of truth (which doc answers what, and which docs sit at the root).
  - Time budget and right-sizing (the user's rule: a simple solution when it fully solves the problem, never a simple one that leaves the problem unsolved).
  - Writing rules: no emojis, no long dashes, lean docs, spec vocabulary.
  - Product guardrails: keys, honesty, one runner, plain text.
  - UI rules and Architecture.
  - Workflow: AskUserQuestion loops, the testing split, git, and where the superpowers skills live.
- User decisions:
  - DRY stays with the Rule of Three.
  - Testing: TDD for logic, screenshots in both themes at desktop and phone widths for presentational UI, and a Playwright e2e test per flow.
  - Logs: a separate `chore(logs)` commit in the same push as the code.
  - Layout: desktop-first fluid, with a phone UI that is just as polished.
- Handed to Step-2: the Commands table, the one-line stack summary and the Next.js 16 caching rules (these wait until TECH-STACK.md is approved).
- ROADMAP Step-0.4 now also deletes `to-discard.md` once its items are removed (user-approved).
- Environment: `pnpm` isn't installed and `node_modules/` is missing, so no `pnpm` gate can run yet (not even Prettier). Step-0.4 needs them to prove the app still builds and passes `check:standards`, so install first (`corepack enable`, then `pnpm install`).

Next: Step-0.4 (discard the items in `to-discard.md` and delete `inspiration-Claude.md`).

## Step-0.4 - discard template parts (2026-10-01) - done, approved by user

- Removed all 10 groups from `to-discard.md`, then `inspiration-Claude.md` and `to-discard.md` itself (git history keeps both):
  - Admin RBAC: `src/lib/rbac/`, the admin page, `authz.prisma`, `authorization.md`, and the `authorize` option in the route and action factories.
  - DB feature flags: `src/lib/flags/`, the flags action, `flags.prisma`, `feature-flags.md`, `POSTHOG_PERSONAL_API_KEY`.
  - AI usage ledger: `src/server/lib/ai-usage/`, `src/server/ai/anthropic.ts`, `ai-usage.prisma`, `ai-usage.md`, `check:ai-models`, the two ai-usage skills, and the AI SDK import ban in ESLint.
  - next-intl: the dependency, `src/i18n/`, `messages/`, and the `[...rest]` route. `src/app/[locale]/*` moved up to `src/app/`, and `src/proxy.ts` now only refreshes the Supabase session.
  - Slack alerts, cron auth, `CRON_SECRET`, `SLACK_ALERT_WEBHOOK_URL`, `NEXT_PUBLIC_DEFAULT_LOCALE`.
  - The analytics demo page.
  - Vercel and remote CI: `deploy-migrations.yml`, `claude-code-review.yml`, `docs/CI_CD_SETUP.md`, and the preview-acceptance-testing, staging-migration, sentry-digest and /cicd skills. `ci.yml` stays (disabled) because `check:standards` reads it.
  - Other agents: `.codex/`, `.codex-logs/` (it held only `.gitkeep`), `GEMINI.md`, `QWEN.md`, `.cursor/`, and the e2e-build skill.
  - The template-setup and skill-creator skills.
  - The 7 template migrations. Step-5 generates a fresh baseline plus the enable-RLS migration.
- Follow-up edits: `AGENTS.md` (rule index, per-tool section), `docs/rules/deployment.md` (localhost only, never deploy) and `docs/rules/migrations.md` (local generation flow) are rewritten. Every kept doc and skill that pointed at a removed file, script, variable or skill is cleaned, except `README.md`, which Step-8 rewrites.
- The home page keeps its template placeholder text, now inline instead of in `messages/en.json`. Step-5 renames it.
- User decisions:
  - Windows fixes. `scripts/check-standards.mjs` runs eslint and tsc through node on Windows, because the `.bin` shims need a shell. It also trusts the git index mode for the hook executable bit, since NTFS has none. The standards test fixture uses junctions and copies instead of symlinks, which need Developer Mode on Windows. Linux behavior is unchanged.
  - `.gitattributes` sets `* text=auto eol=lf`. With `core.autocrlf=true`, Windows checked files out as CRLF, and Prettier flagged all 108 of them.
  - `.prettierignore` now lists `pnpm-lock.yaml`, `docs/requirements.md`, `docs/agent-session-logs-setup.md` and `ROADMAP.md`. `spec.md`, `TECH-STACK.md` and `CAPTURE-TEST.md` were reformatted, which only changed whitespace and table separators. This fixes the `format:check` failure noted in Step-0.1.
- Gates on this machine, all green:
  - `check:standards` 24/24, with 7 checks failing before this step.
  - `test`: 114 pass and 1 skipped on Windows (the executable-bit test; the git-index test covers it). Before this step, 41 of 176 failed; the other tests left with their code.
  - `lint`, `typecheck`, `format:check`, `check:env` and `next build` all pass.
  - The built app serves `/` with 200, and `/typo` and `/en` with the custom 404.
- Environment: `pnpm` is not on PATH. Run it as `corepack pnpm <script>`, or run `corepack enable` once from an admin shell. `node_modules/` is now installed. Playwright's Chromium is not installed yet, so `test:e2e` has not run.

Next: Step-0.5 (check agent logs, and that ROADMAP.md, CLAUDE.md and spec.md are solid).

## Step-0.5 - logs and docs check (2026-10-01) - done, approved by user

- Log capture works, but it had a bug. At `Stop`, the transcript can still end with a mid-turn narration line, and fix 6 accepted that line as the final reply. 3 of 10 session logs had the wrong reply.
  - The fix (user-approved): `~/.claude/extract-log.py` now takes the final reply from the `Stop` hook's `last_assistant_message`. Claude Code 2.1.286 sends that field.
  - Proof: an offline replay of the Step-0.4 race, plus the live CANARY-D session (narration, tool call, final reply).
  - The 3 logs were rebuilt from their transcripts with the user's approval. Every finished log now matches its transcript. Details are in `CAPTURE-TEST.md` (fix 7).
- The auto-mode classifier blocks edits to `~/.claude/` hook scripts until the user approves them in chat. Ask before changing the log script.
- Doc fixes (user-approved):
  - ROADMAP: the README step is now Step-8, since there was no Step-8. It says "how to run it locally" instead of "the live URL" (R95).
  - spec: Methodology needs sign-in (5.1, 12.4), so the shared result page stays the only public page. `design.md` is now `DESIGN.md` (10.4).
- Checked and consistent: ROADMAP, CLAUDE.md and spec agree on keys (Rule-8), local-only, budget, the runner, logging, P0 before P1, and the subagent models. Open items for Step-1 are in spec 17: the password-reset email and the recording cost estimate.
- Gates: `check:standards` 24/24, `format:check` and `check:secrets` pass.

Next: Step-1 (tech stack and rendering strategy in `TECH-STACK.md`, using brainstorming and writing-plans). Wait for approval before Step-2.

## Step-1 - tech stack (2026-10-01) - done, approved by user

- `TECH-STACK.md` is rewritten: a 5-line summary, the constraints, an architecture sketch, one row per layer with its reason, the rendering strategy, the recording cost estimate and Vercel readiness.
- The user's rule for this and later steps: choose tools on the merits of spec, ROADMAP and CLAUDE.md, never because the template ships them. The user also added ROADMAP Rule-9: localhost now, but build everything to deploy on Vercel later from a personal repo. So:
  - the database is hosted;
  - nothing writes files at runtime;
  - no state lives in one process's memory.
- User decisions:
  - Supabase free for Postgres and for Auth (Neon's free compute cap would run out under public traffic).
  - Password reset is out of v1; Resend becomes Supabase's email sender at the Vercel launch.
- Recommendations approved with the doc:
  - Prisma 7, Recordings as versioned JSON under `content/`, and plain `fetch` + Zod per provider (no SDKs, for honest latency).
  - Motion, dnd-kit, hand-built SVG charts, canvas-confetti and next-themes.
  - Vitest for app tests, k6 for the load test.
  - Rendering mix: SSG for content, PPR for per-user pages, CSR for games and runs, cached SSR for shared results. This needs `cacheComponents: true`.
- Recording cost estimate: $5-10 per full run (prices checked 2026-09-25). Opus 5.5 can't turn thinking off, so it records at low effort.
- Doc sync (user-approved): spec R95 and section 17 (the two Step-1 items are settled), and `docs/rules/deployment.md` (never deploy from this repo, but stay Vercel-ready).
- For Step-2 (CLAUDE.md):
  - "Local only" still says "Never deploy"; reword it to Rule-9.
  - Add the Commands table, the one-line stack summary and the Next.js 16 Cache Components rules.
  - `docs/rules/state-management.md` and `components.md` may need the new libraries named.
- For Step-5:
  - Upgrade Prisma 6.19 to 7 (`@prisma/adapter-pg`, `prisma.config.ts`, pooled `DATABASE_URL` on port 6543 and `DIRECT_URL` on 5432).
  - Switch `proxy.ts` from `supabase.auth.getUser()` to `getClaims()`, which Supabase's current guide uses for local JWT checks.
  - Add Vitest next to the template's `node:test` script tests.

Next: Step-2 (revisit CLAUDE.md against ROADMAP.md, spec.md and TECH-STACK.md).

## Step-2 - CLAUDE.md and ROADMAP.md revisit (2026-10-01) - done, approved by user

- `CLAUDE.md` gained:
  - "Stack and commands": the one-line stack, a Commands table for the scripts that exist now, and the `corepack pnpm` note.
  - "Rendering and caching": the Next.js 16 Cache Components rules, checked against `node_modules/next/dist/docs/`.
  - "Local now, Vercel later", which replaces "Local only" (Rule-9).
  - Lines on `content/` JSON, no provider SDKs, keys in one React context, Motion/dnd-kit/SVG charts, and Vitest vs `node:test`.
- `TECH-STACK.md`: status is now "approved". Share delete uses `updateTag`, not `revalidateTag`. The Next 16 docs say `revalidateTag` serves stale content once more, and R87 needs the link dead at once.
- `ROADMAP.md` (user-approved): Step-5 now names its items (Prisma 7, `getClaims()`, Vitest, `cacheComponents`, UI libraries). Step-7 now owns the k6 load test (R78, P1).
- The user asked for the keys rule to live in `CLAUDE.md`, not as a one-bullet edit to `docs/rules/state-management.md`.
- Gates: `format:check` and `check:standards` 24/24 pass.
- For Step-3: the shared result route `[shareId]` has no known params at build. Under Cache Components, read `params` inside `<Suspense>` (or follow the "ISR with Cache Components" guide in the Next docs). Also, the default `'use cache'` handler is in-memory, which doesn't persist across serverless requests on Vercel. That is fine for share snapshots, since they re-read from Postgres.
- When Step-5 adds Vitest and Step-6 adds `pnpm record`, add their rows to the Commands table in `CLAUDE.md`.

Next: Step-3 (DESIGN.md with brainstorming and writing-plans).

## Step-3 - DESIGN.md (2026-10-01) - done, approved by user

- `DESIGN.md` is rewritten as the build guide. It covers:
  - architecture and the runner (one RunEvent stream for replay and live);
  - content and Recording files, and the recording CLI;
  - modes, keys and the `/api/jev` pass-through;
  - screens, levels, games, Arena, Sandbox and quizzes;
  - XP, badges and the Leaderboard;
  - Prisma models and Server Actions, errors and observability;
  - design tokens, tests, flows, and a 14-slice plan.
    The template's token conventions are folded into section 13.
- Skills: brainstorming and writing-plans, read from `~/.claude/plugins/cache/claude-plugins-official/superpowers/6.3.0/skills/` and followed by hand. Each of the 5 design sections was approved in turn.
- User decisions (DESIGN.md section 1):
  - Claude writes the content items and their answers, and the user spot-checks them.
  - Races use 4 equal lanes plus Skip to result.
  - Opus 5.5 is the default Beginner opponent everywhere.
  - Colors: teal / violet / slate.
  - Unpriced Developer mode models show "price unknown".
  - The Leaderboard keeps the best result per game, model and mode.
- Slice plans: DESIGN.md holds the ordered slice list. Step-6 writes each slice's detailed plan with writing-plans in `docs/superpowers/plans/` at the start of that slice.
- Doc sync (user-approved): spec 17 marks the Step-3 items settled; TECH-STACK adds Radix Popover (the opponent picker).
- Things to verify later, not assumed:
  - Level 2 expects TypeSafe to return 422 for a free-text question type; the recording shows whatever it really returns.
  - Jev question shapes were checked against docs.typesafe.ai on 2026-10-01.
- For Step-4: check DESIGN.md against spec, TECH-STACK, ROADMAP and CLAUDE.md. Points worth a second look:
  - about 215 LLM items x 3 models against the $5-10 recording estimate;
  - the Sandbox token estimate (characters / 4) is labelled as an estimate;
  - the CSP `connect-src` allowlist must also cover anything Step-5 adds.
- Gates: `format:check` passes.

Next: Step-4 (validate the docs with brainstorming before coding).

## Step-4 - docs validation (2026-10-01) - done, approved by user

- Skill: brainstorming, read by hand from `~/.claude/plugins/cache/claude-plugins-official/superpowers/6.3.0/skills/brainstorming/SKILL.md`. This step was a review, so it produced doc fixes, not a new design doc.
- Deadline: the hard deadline is 2026-10-03, and the user wants to ship sooner. ROADMAP Rule-1, CLAUDE.md and spec R94 now carry the date (user-approved).
- User decisions:
  - Cuts: if P0 slices fall behind, ask the user at that slice. There is no cut order set in advance.
  - Honesty: if a recording doesn't show a level's lesson, rewrite the items to target the documented weakness, record once more, and say so on Methodology. Never re-run the same items (spec 12.4, DESIGN 1).
  - Level 2 is now "Write Me a Poem" (a 4-line poem), so it can't be confused with the Haiku 4.5 model, and it has no Jev judging step.
- Fixes applied (user-approved):
  - `pnpm test` must keep the template's `node:test` run. `check:standards` requires `test` to include `--test` and `src/**/*.test.mts` (the logger contracts), so Step-5 makes `test` run node:test and then `vitest run`. Vitest files use `*.test.ts(x)`.
  - Runner: `combine: codeFnId` derives the "Jev + Code" racer (`jev_code`) from Jev's results, for level 3's fix and level 5's weights. `correct: boolean | null` covers items with no stored answer (Arena custom task); accuracy is over scored items only.
  - Recordings load per page, through server-component props, never imported by a client module (R79). A Vitest test fails if any task lacks a hash-matching recording.
  - Slice 4 stops at Reveal; the Check step moves to slice 5 with `submitCheck`, so no control is ever dead. Slice 10 writes the 3 Arena tasks that P1 games reuse in slice 13.
  - `recordArenaRun` and `recordDevRun` give XP only; only `recordGameRun` writes the Leaderboard. `signIn` and `signUp` don't call `requireUser()`. The proxy leaves `/api/*` alone; handlers return a JSON 401. The CSP adds `ws:` and `'unsafe-eval'` in dev only.
- Checked and fine: about 234 LLM items x 3 Claude models is about 700 calls, $4-8 counting Opus low-effort thinking, within the $5-10 estimate.
- For Step-5:
  - Verify `getClaims()` checks the session locally only when the Supabase project uses asymmetric JWT signing keys; enable them, or it falls back to a network call per request.
  - The user creates the Supabase project, plus the free Sentry and PostHog projects, and pastes their env values into `.env.local`.
- For slice 8: confirm OpenRouter's `/api/v1/systemone` accepts browser CORS (spec 2.3 probed OpenRouter in general).
- Gates: `format:check` and `check:standards` pass.

Next: Step-5 (foundation). Start by asking the user for the Supabase, Sentry and PostHog accounts and keys it needs.

## Step-5 - foundation (2026-10-01) - in progress: code done, database items wait on the user's env values

- No ROADMAP skill names this step; it followed the Step-5 item list and `docs/rules/migrations.md`. The user approved the plan plus two extras: Sentry/PostHog scrubbing and installing Playwright Chromium.
- New ROADMAP Rule-10 (user-approved): every external service gets step-by-step setup in `docs/api-setup-guide.md`, written in the step that adds it. `CLAUDE.md` > Source of truth points to it.
- Done:
  - Renames: package `jevs-playground`, app title and description, the home page text, the `.env.example` header. `README.md` waits for Step-8.
  - Prisma 7.10:
    - The `prisma-client` generator outputs to `src/server/db/generated/` (gitignored, rebuilt by postinstall), with `importFileExtension = ""` so the node:test loader can import it.
    - `prisma.config.ts` loads `.env.local` with `process.loadEnvFile` and migrates over `DIRECT_URL`.
    - `src/server/db/client.ts` uses `PrismaPg` on `DATABASE_URL`.
    - Scripts: `generate-migration.mjs` uses `--from-config-datasource`, and `run-once-sql.mjs` uses `db execute` without `--url`; both pass their `--db-url` to the CLI as `DIRECT_URL`. `check-rls.mjs` uses the adapter. `check:rls` and `db:run-once` run through `scripts/register-ts.mjs`, and all three load `.env.local`.
    - ESLint bans the generated client and `@prisma/adapter-pg` outside `client.ts`. `ci.yml` (disabled) uses the Prisma 7 flags.
  - `src/proxy.ts` calls `getClaims()`. The sign-in redirect gate is slice 1.
  - Vitest 5 + Testing Library + jsdom (`vitest.config.mts`, `vitest.setup.ts`, `resolve.tsconfigPaths`). `pnpm test` runs node:test and then `vitest run`.
  - `cacheComponents: true` is on; the build passes.
  - UI libraries installed, not yet wired: Radix Dialog/Tabs/Slider/Switch/Tooltip/Popover, `motion`, `@dnd-kit/core`, `canvas-confetti`, `next-themes`. `@types/node` is now ^22, a Vitest peer requirement.
  - `src/lib/observability/scrub.ts` (10 tests) drops the `authorization`, `x-api-key` and `x-goog-api-key` headers, provider and `/api/jev` bodies, and `?key=` params from Sentry events and breadcrumbs, in all three Sentry inits. PostHog sets `maskAllInputs`. Nothing mounts `PosthogIdentify`; keep it that way, since analytics stay anonymous (R85).
  - Playwright Chromium is installed, and `webServer` runs `corepack pnpm dev`. The smoke e2e passes.
  - Fixes found on the way: `env.ts` rejected the empty `LOG_LEVEL=""` that `.env.example` ships, so the app couldn't boot from a fresh copy. AGENTS.md had lost its `BEGIN:nextjs-agent-rules` marker, so `next dev` appended a duplicate block on every run.
- User decisions: PostHog US cloud. Supabase "Enable automatic RLS" stays off, because it would hide a migration missing its RLS line. Don't buy the IPv4 add-on: the user's dialog shows Direct and Transaction pooler as IPv6, so both URLs come from the Session pooler string, with port 6543 plus `?pgbouncer=true` for `DATABASE_URL`.
- Gates: lint, typecheck, format:check, check:env, check:secrets, check:standards 24/24, test (114 node:test pass + 1 skipped, 12 Vitest), build, e2e smoke.
- Remaining Step-5 work, next session:
  1. The user fills `.env.local` from `docs/api-setup-guide.md`. Check which variables are set without printing values.
  2. `corepack pnpm exec prisma migrate deploy` (nothing to replay yet), then `node scripts/generate-migration.mjs --name baseline` for `users` and `_run_once_sql`.
  3. The hand-written enable-RLS migration: `ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;` and the same for `"_run_once_sql"`, in its own migration folder. Apply it with `migrate deploy`, then run `corepack pnpm db:run-once` and `corepack pnpm check:rls`.
  4. Watch for: Prisma 7's pg adapter changed SSL defaults. If the pooler connection fails on certificates, check the Supabase SSL docs before touching `rejectUnauthorized`.
  5. Boot `corepack pnpm dev` with the real values; confirm a Sentry test event arrives with no key headers, and that PostHog receives a pageview.
  6. Run local-review, commit, then the `chore(logs)` commit, and mark Step-5 done.
