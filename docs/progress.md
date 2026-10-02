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

## Step-5 - foundation (2026-10-01) - done, approved by user

- No ROADMAP skill names this step. It followed the Step-5 items and `docs/rules/migrations.md`. The user approved the plan plus two extras: Sentry/PostHog scrubbing and Playwright Chromium.
- ROADMAP rules added this step (user-approved), each mirrored in `CLAUDE.md` (Rule-3):
  - Rule-10: setup steps for every external service in `docs/api-setup-guide.md`.
  - Rule-0.2: ask questions with full context.
  - Rule-11: verify localhost with the Claude-in-Chrome extension.
  - The user also changed Rule-1 to "Remaining days in deadline: 2" (deadline 2026-10-03).
- Done:
  - **Renames:** package `jevs-playground`, app title and description, the home page text, the `.env.example` header. `README.md` waits for Step-8.
  - **Prisma 7.10:**
    - The `prisma-client` generator writes to `src/server/db/generated/` (gitignored, rebuilt by postinstall).
    - `prisma.config.ts` loads `.env.local` and migrates over `DIRECT_URL`. `client.ts` uses `PrismaPg`.
    - The scripts use the Prisma 7 CLI flags: `--from-config-datasource`, and `db execute` without `--url`.
    - `check:rls` and `db:run-once` run through `scripts/register-ts.mjs`.
  - **Database:** the baseline migration (`users`, `_run_once_sql`) and the hand-written enable-RLS migration are applied to the Supabase dev project. `check:rls` passes on 2 tables. `db:run-once` runs (nothing to apply).
  - **Verified TLS on every connection** (the probe showed the default was plain text, so the password crossed the internet unencrypted):
    - Supabase's public root CA is at `prisma/prod-ca-2021.crt`, read by `src/server/db/tls.ts` (test included), and Enforce SSL is on.
    - `prisma.config.ts` adds `sslmode=require`, `sslcert` and `sslaccept=strict`. Without `sslaccept=strict` the Prisma CLI accepted a fake CA in testing; with it the fake CA fails with P1011.
    - `next.config.ts` traces the cert into server functions for Vercel.
  - **Other items:** `proxy.ts` uses `getClaims()` (the redirect gate is slice 1). Vitest 5 + Testing Library + jsdom; `pnpm test` runs node:test and then Vitest. `cacheComponents: true`. The UI libraries are installed but not wired.
  - **Scrubbing** (`src/lib/observability/scrub.ts`, 11 tests): drops key headers, provider and `/api/jev` bodies, and `?key=` from the request, the breadcrumbs and the event contexts. The contexts case was found through Chrome: `@sentry/nextjs` copies the query into `contexts.nextjs.request_path`. PostHog masks all inputs. Nothing mounts `PosthogIdentify`, so analytics stay anonymous (R85).
- Verified live, through Claude-in-Chrome on the user's dashboards:
  - Sentry (org `resorvoir`, project `jevs-playground`) holds the server probe error, with no key headers and no fake key anywhere in the event.
  - PostHog's "Default project" (the key's project) receives `$pageview`, `page_viewed`, `app_opened` and `$web_vitals` from `localhost:3000`.
  - Headless Playwright gets flagged as a bot by PostHog, so check PostHog through Chrome, not headless runs.
  - The two "Step-5 ... probe" Sentry issues can be resolved; the probe route is deleted.
- Bugs fixed on the way:
  - `env.ts` rejected the empty `LOG_LEVEL=""`.
  - AGENTS.md was missing its `BEGIN:nextjs-agent-rules` marker, so `next dev` duplicated the block on every run.
  - Two Windows entry checks (`file://${argv[1]}`) never matched, so `main()` never ran. In `run-once-sql.mjs` the script did nothing; in `check-commit-message.mjs` the commit-msg hook never checked anything (two past commits, d936d09 and 139119b, have headers over 72 characters). Both now use `pathToFileURL`.
  - Playwright's `webServer` now runs `corepack pnpm dev`.
- User decisions:
  - PostHog US cloud.
  - Supabase "Enable automatic RLS" off.
  - No IPv4 add-on. Both URLs come from the Session pooler string; `DATABASE_URL` uses port 6543 plus `?pgbouncer=true`.
  - Verified TLS with the CA (option A).
- Gates: lint, typecheck, format:check, check:env, check:secrets, check:standards 24/24, test (node:test plus Vitest), build, e2e smoke, check:rls.
- For slice 1 (Step-6):
  - The home page is a placeholder until the shell lands.
  - `server-only` resolves only inside Next's bundler. Test DB code through the generated client plus `databaseSsl()`, as `scripts/check-rls.mjs` does.
  - The CSP `connect-src` (slice 8) must allow `us.i.posthog.com`, `us-assets.i.posthog.com` and the Sentry ingest host `*.ingest.us.sentry.io`.

Next: Step-6, slice 1 (Shell), with the subagent-driven-development and writing-plans skills.

## Step-6 - slice 1: Shell (2026-10-01) - done

- Skills: writing-plans for `docs/superpowers/plans/2026-10-01-slice-01-shell.md`, then subagent-driven-development.
  - The skills were read by hand from `~/.claude/plugins/cache/claude-plugins-official/superpowers/6.3.0/skills/`; the path has a space, so quote it.
  - The SDD helper scripts (`sdd-workspace`, `task-brief`, `review-package`) run with `bash "<skill dir>/scripts/<name>"`.
  - Every task got a Sonnet implementer and a Sonnet task reviewer, one subagent at a time, then a final whole-slice review, one fix wave and a scoped re-review.
  - The scratch workspace `.superpowers/` is git-ignored and now also Prettier-ignored.
- User decisions:
  - Commit straight to `main`.
  - Real e2e test accounts in the Supabase dev project are OK.
  - Passwords have at least 8 characters, enforced on sign-up only, so sign-in accepts any length.
  - The Glossary link sits in the footer and on Home, not in the header.
  - Header links, the progress bar, the mode switch and the Keys button arrive in the slices that build their pages.
- Built:
  - Design tokens (DESIGN 13.1) for both themes, with an AA contrast test.
  - next-themes (class-based `.dark`), Nunito and `LazyMotion strict` with `MotionConfig reducedMotion="user"`. Use `m.*`, not `motion.*`.
  - `src/lib/constants.ts`, `src/lib/links.ts` (`ROUTES`) and `src/lib/auth-gate.ts` (`gateRedirect`).
  - `src/server/auth/session.ts` (`getSession`, `requireUser`) and `src/server/actions/auth.ts` (`signIn`, `signUp`, `signOut`). Supabase codes map to plain English; network failures show a message instead of the error page.
  - `proxy.ts` gates every page except `/sign-in` and `/s/*`.
  - `/sign-in` with tabs; the `(app)` layout with the header (logo, theme switch, email, Sign out) and a footer Glossary link.
  - Home (a placeholder until slice 5) and Glossary (28 terms from `content/glossary.json`, Zod-validated).
- Tests: 69 Vitest tests, 9 Playwright tests in `e2e/shell.spec.ts`. The e2e file runs serially, makes 2 real sign-ups per run and writes 12 screenshots to the gitignored `e2e/screenshots/`. All gates pass, and Chrome confirmed the gate redirect.
- For later slices:
  - Every page or action that reads user data must call `getSession`/`requireUser`; the proxy is only the optimistic check.
  - `signOut` is called as `signOut(undefined)`, because `validatedAction`'s parameter is required.
  - Vitest aliases `server-only` to `vitest.server-only.ts`.
  - If Supabase email confirmation is ever turned on, `signUp` would provision and redirect without a session. Add a "check your email" path then.
  - E2E accounts (`e2e+*@example.com`) pile up in the dev project; a purge script is deferred.
- Deferred minors:
  - Skip link (slice 13 accessibility pass).
  - Keep the typed email when switching sign-in tabs.
  - Copy Cache-Control onto proxy redirects (at the Vercel launch).
  - `min-h-dvh`.
  - Tests for `/s/` paths (slice 10).

Next: Step-6, slice 2 (Runner core). Write its plan with writing-plans, then run subagent-driven-development.

## Step-6 - slice 2: Runner core (2026-10-01) - done

- Skills: writing-plans for `docs/superpowers/plans/2026-10-01-slice-02-runner-core.md`, then subagent-driven-development (Sonnet implementer and reviewer per task, one at a time; a final whole-slice review and one fix wave).
- User decisions:
  - `ItemResult` has `credit` (0 to 1; the share right for `fan_out`). `correct` is `credit === 1`, and accuracy is total credit over scored items.
  - Code racer scope: the machinery plus `count_true`, `compare_dates` (combine and Code racer) and `weighted_composite`. Content-specific Code functions arrive with their content slice.
  - Content loads through explicit import registries (`src/content/tasks.ts`, server-only `src/content/recordings.ts`). `registry.test.ts` fails when a file on disk is missing from them.
  - The `/api/jev` pass-through and its `Server-Timing` latency stay in slice 8.
- Built (no UI):
  - `src/content/task-schema.ts`: the Task schema with every kind and its rules (`taskProblems`).
  - `content/prices.json`: Jev, Opus 5.5, Sonnet 5.5 and Haiku 4.5, checked 2026-10-01 with source URLs.
  - `src/runner/`: types, the TypeSafe and Anthropic providers (one timed fetch, no retries, `ProviderError`), `jev-request`, `llm-prompt` (R92), parse, score, cost, totals, `racers.ts` (`jevRacer`, `llmRacer`, `codeRacer`), `run.ts` (`runItems`), `combine.ts` (`createCombineTap`), `replay.ts` (`replaySource`), plus the Code functions.
  - `src/content/`: `recording-schema.ts`, `task-hash.ts`, `tasks.ts`, `recordings.ts`.
  - DESIGN.md 3.1, 3.2 and 4.1 were updated to match.
- Verified API facts, used verbatim in the code:
  - TypeSafe response shapes are from `docs.typesafe.ai/api`.
  - Opus 5.5 can't turn thinking off, so it runs with `output_config: { effort: 'low' }`. Sonnet 5.5 and Haiku 4.5 run at defaults.
  - Anthropic's thinking tokens are billed inside `output_tokens`.
- For slice 3 (recording CLI):
  - Wire a run like this: `runItems(task, racer, jevRacer({ task, call: (body, signal) => callTypeSafe(body, key, signal), prices: PRICES }), { onEvent })`.
  - For the LLM, use `llmRacer` with `(prompt, signal) => callAnthropic(buildAnthropicBody(modelId, prompt), key, signal)`.
  - Recording events need `lane`, `startMs` and `endMs` from the `RunEvent`s.
  - `taskHash(task)` comes from `src/content/task-hash.ts`.
  - The recording file path is `content/recordings/<taskId>/<recordingSlug(...)>.json`. Sanitize ids that contain "/" when OpenRouter models arrive.
  - Import each new task and recording JSON into its registry.
  - Add `TYPESAFE_API_KEY` and `ANTHROPIC_API_KEY` to `.env.example` and `env.ts` as owner-only.
  - `buildLlmPrompt` gives the dry-run character count.
- Rulings and deferred minors (kept as known edges):
  - An Anthropic `stop_reason` of refusal or max_tokens becomes a parse miss (R44).
  - Failed calls are priced $0.
  - A combine misfit shows as "couldn't parse" with Jev's raw text, because `error` is a provider-error kind only.
  - The replay tie-break at equal timestamps relies on the recorded event order.
  - `find_lines` labels are not de-duplicated.
- Gates: lint, typecheck, format:check, check:env, check:secrets, check:standards 24/24, test (202 Vitest plus node:test), check:rls and build all pass.

Next: Step-6, slice 3 (Recording CLI + level 1 content). It writes the Speed Race task, needs the user's spot-check of the 40 tickets, and asks before any paid recording run, showing the dry-run cost first.

## Step-6 - slice 3: Recording CLI + level 1 content (2026-10-01) - in progress, paused for the paid recording

- Skills: writing-plans for `docs/superpowers/plans/2026-10-01-slice-03-recording-cli.md`, then subagent-driven-development (Sonnet implementer and reviewer per task, one at a time; an Opus final whole-slice review). The SDD ledger is `.superpowers/sdd/2026-10-01-slice-03-recording-cli/progress.md` (git-ignored); it lists every ruling and deferred minor.
- User decisions:
  - Speed Race categories: `billing`, `technical`, `account`, `shipping`, `feature_request`, 8 tickets each, fictional online shop. The 40 tickets were spot-checked and approved as is.
  - The Methodology link sits in the footer next to Glossary.
  - `tsx` added as a devDependency.
  - Keys are never shared through the chat, not even as an attached file (it would reach `.claude-logs/`). The user adds them to `.env.local` at the PC.
- Built and committed locally (not pushed):
  - Task 1 `62b5bb4`: `scripts/record/targets.ts` (args, which task and model pairs to run, skip when the recording's `taskHash` is current) and `estimate.ts` (dry run: characters / 4 input, 500 output tokens per LLM call). `pnpm record` script; Vitest now also runs `scripts/**/*.test.ts`.
  - Task 2 `bf8291b`, `eb282a7`: `record-target.ts` (runs one racer through the shared runner and builds the Recording), `files.ts` (Prettier-formatted writes, stored hash, spend on disk against the $50 budget), `keys.ts` (owner keys, read only here), entry `scripts/record.ts`. A run is refused, with nothing written, when an LLM answers as a model other than the one requested, when every call failed, or when one run sees two model versions.
  - Task 3 `bdd6d7c`: the `/methodology` page (sections: same inputs, how a race runs, model settings, parsing and scoring, cost with the price table, how items are chosen, recordings table), the footer link, e2e test and screenshots, `.env.example` owner keys, `docs/api-setup-guide.md` section 4, the `record` row in `CLAUDE.md`, and wording fixes in `TECH-STACK.md` and `DESIGN.md` 4.2.
- Final whole-slice review (Opus): ready after fixes. Fix wave `3db0bc7`, `be4efae`, re-reviewed clean:
  - User-approved DESIGN 4.2 change: a provider-side failure (rate limit, overload, network) stops that model's run and writes nothing; unparseable or malformed answers are still stored as they happened. Methodology says so.
  - The answering model is checked on every reply, so a wrong model id costs at most 4 or 5 calls, not 40.
  - The run summary (files written, cost, budget) always prints, even when a later model fails.
  - Methodology names the 16,000-token output cap and says "a call that returns an error costs $0".
- Known gap to close by the end of slice 4: Methodology already describes replays at recorded latency, the "couldn't parse" note and "price unknown", which the race view (slice 4) and Developer mode (slice 8) build.
- Deferred minors: `jevPriceKeys` sorts version strings lexicographically (dry run only); pnpm's "esbuild build script ignored" warning (tsx works); no mid-run abort test; Methodology table row headers differ.
- Not committed yet (Task 4): `content/tasks/speed-race.json` and its import in `src/content/tasks.ts`. `registry.test.ts` fails until the four recordings exist, so they must land together.
- Dry run (spent nothing): Jev ~$0.0003, Haiku 4.5 ~$0.11, Sonnet 5.5 ~$0.22, Opus 5.5 ~$0.43, total ~$0.76 (output side overestimated on purpose).

- User decision (2026-10-01): the user is away from the PC, so slice 4's key-independent work starts in the next session, before slice 3 is pushed. Slice 3's Task 4 (the paid recording) finishes when the user is back at the PC.

Next: part A (slice 4's key-independent work) is done; see the slice 4 section below. Resume there.

## Step-6 - slice 4: Level loop + race view (2026-10-01) - in progress, key-independent part done

- Skills: writing-plans for `docs/superpowers/plans/2026-10-01-slice-04-level-loop.md`, then subagent-driven-development (Sonnet implementer and reviewer per task, one at a time; an Opus final whole-slice review, one fix wave, a scoped re-review). The ledger is `.superpowers/sdd/2026-10-01-slice-04-level-loop/progress.md` (git-ignored); it lists every ruling and deferred minor. Keep it until slice 4 is done.
- User decisions:
  - Level 1 Predict asks three two-way picks (Jev or the LLM): who finishes first, who costs less, who gets more right. Reveal marks each right, wrong, tie or "can't tell".
  - Home gets "Play level 1: Speed Race" now, in the same commit as level 1's content.
- Built and committed locally (not pushed), `84bb387..d2de8de`, 14 commits:
  - `src/features/race/`: `useRace` (replays at recorded speed, `skip`, `cancel`, live counters from the runner's `computeTotals`, final numbers from the recorded totals), `RacerTag`, `ModeLabel`, `Scoreboard`, the race view (tracks, busy lanes, Skip to result), the opponent picker popover (arrow keys move, Enter, Space or a click picks, Esc cancels), `RaceStage` (remounted by `key` to switch opponents).
  - `src/content/level-schema.ts` and `levels.ts` (registry, empty in the committed tree), `src/features/levels/`: `judgePrediction`, the stepper (`?step=`, every step open, focus moves to the new step's heading), Learn, Predict, Play, Reveal (prediction results, every recorded model's numbers, why, docs link, every item with "Couldn't parse" plus raw text, confetti on a right prediction).
  - Constants `RACE_STATUS`, `LEVEL_STEPS`, `PREDICTION_METRICS`, `PREDICTION_OUTCOMES`, `ITEM_OUTCOMES`; `typesafeDocsUrl` in `links.ts`; DESIGN 3.3 and 4.1 match the code.
  - `HEAD` alone passes typecheck, lint, format and 309 Vitest tests (checked in a clean worktree). The build was checked with the uncommitted level route in the tree, which bundles all of this code.
- Written but not committed (Task 7, lands with the recordings): `content/levels/speed-race.json`, its import in `src/content/levels.ts`, `src/app/(app)/levels/[levelId]/page.tsx`, `ROUTES.level` in `src/lib/links.ts`, and the Home button in `src/app/(app)/page.tsx`. Reason: under Cache Components, `generateStaticParams` must return at least one param, so the route can't be committed while the level registry is empty.
- Checked in Chrome and Playwright: the gate redirect; Home's button opens level 1; Learn and Predict in both themes at 1280 and 390 px with no horizontal overflow; Enter locks in the prediction; back returns to Predict with the picks kept; Play and Reveal show their "not recorded yet" states. The Chrome extension's screenshots timed out, so screenshots were taken with a scratch Playwright script. A test account `e2e+slice4-check@example.com` now exists in the Supabase dev project.
- Methodology is now true for "replays at recorded latency" and the "couldn't parse" note (`price unknown` stays for slice 8).
- For slice 5: confetti fires on every visit to Reveal (gate it on the first reveal); the prediction and opponent live in stepper state and are lost on reload (store the prediction); `prediction_made` and `level_started` analytics.
- For slice 6: Reveal and the judge read recordings only, so a combine task (level 3) needs runner-derived Jev + Code totals there; add a `useRace` test with a combining task.
- Deferred to slice 13 (accessibility pass): a screen reader's browse-mode click on a picker option moves the highlight without picking (Tab and Enter work).

## Step-6 - slice 3: finished (2026-10-01)

- ROADMAP Rule-A (user-added): all Anthropic spend for the whole build, recordings included, stays within the $20 credit; the remaining project budget is 7000 PKR. Rule-0.1, CLAUDE.md, spec, DESIGN 4.2 and TECH-STACK say so (user-approved). Commit `56d3ede`.
- The recording CLI counts only LLM recordings against `ANTHROPIC_CREDIT_USD = 20` (`scripts/record/files.ts`) and refuses a run whose dry-run estimate would pass it (`creditShortfall` in `estimate.ts`, tested). Commit `7293cdf`.
- Recorded with approval (Haiku first, then the rest), commit `851829e`:

  | Racer      | Correct | Wall time | Cost    |
  | ---------- | ------- | --------- | ------- |
  | jev-1.13.0 | 39/40   | 4.2 s     | $0.0007 |
  | Haiku 4.5  | 40/40   | 7.6 s     | $0.0108 |
  | Sonnet 5.5 | 39/40   | 13.1 s    | $0.0284 |
  | Opus 5.5   | 39/40   | 22.5 s    | $0.0561 |
  - Anthropic spend on disk: $0.0953 of $20. The dry run overestimates LLM output about 10x (500 tokens allowed, about 14 real), so later estimates are safe upper bounds.
  - Misses: Jev picked `billing` for t35 (PayPal request, 0.69 vs 0.31 `feature_request`). Sonnet (t35) and Opus (t11) wrote a sentence of reasoning before the JSON, against "Reply with only this JSON object", so they are parse misses with the right answer inside (R44). Level 1's Reveal shows them as "Couldn't parse"; worth a line in its copy.
  - The lesson holds against all three Claude models: Jev is fastest and cheapest. On accuracy Haiku wins and Sonnet and Opus tie Jev.

- `/methodology` in Chrome lists the 4 recordings. Chrome screenshots still time out; use a scratch Playwright script for screenshots.
- Both keys stay in `.env.local` (gitignored) because later slices record more content; the user removes them when recording is done (R22).

## Step-6 - slice 4: finished (2026-10-01)

- Level 1 plays end to end from the real recordings: Learn, Predict, a race at recorded speed (or Skip to result) against any of the three Claude models, and Reveal. Commits `aee9c70` (fix) and `e44b80d` (feature), after `local-review` passed (lint, typecheck, format, check:env, check:secrets, check:standards 24/24, test 313 Vitest plus node:test, check:rls, build with `/levels/speed-race` prerendered, e2e 17/17).
- User decision: Reveal's "why" now has an accuracy paragraph (the race is close and depends on the opponent; text around the JSON counts as a miss). Content stays free of numbers; the recordings supply them.
- Bugs found and fixed:
  - The opponent picker opened with focus on the first option, not the current pick, so arrow keys started from the wrong model. Radix's `onOpenAutoFocus` now focuses the checked option (unit and e2e tests).
  - `ModeLabel` used `break-all` and split words on phones ("Beginner mo de"); it now uses `wrap-anywhere`.
- Checked in Chrome: a real mouse click on an option's text picks it. The Chrome tab's renderer gets throttled (screenshots time out, and a reloaded page can sit with a zero-size layout), so the keyboard pick and the rest of the flow are verified by `e2e/level-1.spec.ts` in real Chromium.
- `e2e/helpers.ts` now holds the shared sign-up, sign-in, viewport and no-horizontal-scroll helpers. `level-1.spec.ts` makes one real sign-up per run and writes 20 screenshots (every step, both themes, 1280 and 390 px).
- The dev server on port 3000 left from an earlier session had a crashed static-params worker (blank level page). If a page renders blank in dev, restart `corepack pnpm dev` first.
- `.superpowers/speed-race.draft.json` is a slice 3 scratch draft, untracked; delete it when convenient.
- Carried to slice 5: confetti on every Reveal visit, the prediction lost on reload, `prediction_made`/`level_started` analytics. To slice 6: Jev + Code totals in Reveal and the judge, and a `useRace` test with a combining task. To slice 8: "price unknown". To slice 13: the screen-reader browse-mode click in the picker, the skip link.

Next: Step-6, slice 5 (Progress: Prisma models, the Check step, XP and badges, Home, Path). Write its plan with writing-plans, then run subagent-driven-development.

## Step-6 - slice 5: Progress (2026-10-02) - in progress

- A power cut ended the first slice 5 session before any code or plan was written (checked: no commits after `33b91f2`, no plan, no ledger, no uncommitted source).
- User decisions:
  - A level's prediction is correct (25 XP, counts toward `oracle`) when every pick with a clear winner is right and at least one pick is right; ties and "can't tell" are ignored.
  - Picks are saved on the server at Lock in, so a reload keeps them. The first Reveal is judged on the server against the opponent raced, and that result is final; later Reveals still show right or wrong but change no XP. Confetti fires only on that first Reveal.
  - Check: the first answer is stored and decides the XP; the user then sees the right answer and explanation and may retry for learning, with no XP change. Revisits show the stored answers.
  - Path and the header bar count only built levels (`n of LEVELS.size`), so nothing links to a missing page.
  - Level 1's 2 Check questions (tool choice for 50,000 tickets a day; why the LLM costs more per ticket) were approved as drafted; they go into `content/levels/speed-race.json` under `check`.
- Skills: writing-plans for `docs/superpowers/plans/2026-10-02-slice-05-progress.md`, then subagent-driven-development (Sonnet implementer and reviewer per task, one at a time; Opus final review). The ledger is `.superpowers/sdd/2026-10-02-slice-05-progress/progress.md` (git-ignored). It holds every ruling, and `final-review.md` sits next to it. Keep both until slice 5 is done.
- All 6 tasks are built, reviewed and committed locally on `main`. Nothing is pushed yet. Commits `ff177c3..4c56b9d` (11):
  - Task 1 `ff177c3`, `440f058`: `check` in the level schema and level 1's 2 questions, plus the `XP_SOURCES`, `XP_AMOUNTS`, `BADGES`, `BADGE_LABELS` and `LEVEL_COUNT` constants. `isPredictionCorrect` and `judgeAll` in `judge.ts`; `src/server/progress/rules.ts`.
  - Task 2 `16bd7a7`: `prisma/schema/progress.prisma` (LevelProgress, CheckAnswer, XpEvent, UserBadge). Migrations `20261002014132_progress` and the hand-written `20261002014133_progress_rls` are applied to the dev database; `check:rls` passes on 6 tables.
  - Task 3 `a7f0fa8`, `e6da3b2`: `src/server/actions/progress.ts` (`setLevelStatus` skip only, `submitPrediction`, `revealPrediction`, `submitCheck`), `src/server/awards/awards.ts`, `src/server/data/progress.ts` (`getProgressSummary` wrapped in `cache()`, `getLevelProgress`) and `src/server/progress/complete.ts`. The first Reveal is an atomic claim (`updateMany ... revealedAt: null`), DB enums go through the `isLevelStatus`/`isBadgeId` guards, and actions call `refresh()` from `next/cache` after a successful write.
  - Task 4 `419470e`, `721ddce`: `use-level-progress.ts` (TanStack mutations, optimistic updates, rollback, toasts, analytics `level_started`/`level_completed`/`prediction_made`), `check-step.tsx`, `awards-toast.ts`, first-Reveal-only confetti (`consumeCelebration`), and the level page loading progress inside `<Suspense>`.
  - Task 5 `3f3d219`, `9487411`: `/path` (Skip/Revisit), Home progress (XP, badges), and the header Path link plus progress bar. The wordmark is hidden below `sm`; measured with no horizontal scroll at 360 and 390 px.
  - Task 6 `b578e68`, `4c56b9d`: `e2e/progress.spec.ts` (flow 1 with 145 XP and First Race, replay awards nothing, reload keeps picks, flow 2, screenshots); DESIGN 11.1 and 11.3 updated (`revealPrediction`, `refresh()`).
  - Last gates: Vitest 406/406, e2e 26/26, typecheck, lint, format:check and build all pass.
- Final whole-slice review (Opus): READY_AFTER_FIXES. Full text: `.superpowers/sdd/2026-10-02-slice-05-progress/final-review.md`.
  - **Important I1 (must fix):** `use-skip-level.ts` and `use-level-progress.ts` seed state once with `useState(initial)` and ignore the fresh props that `refresh()` sends, while Next 16 Activity keeps client state across navigations. So after a client navigation, Path can show a stale status ("Skipped" or "Not started" after finishing the level, where Skip then returns 409). After a sign-out and sign-in in one tab, the old user's progress can flash. Fix: derive the view from the server props plus an optimistic overlay (or resync when the props change), key both client roots by `session.userId`, and make the flow 2 e2e reach Path through the header link instead of `page.goto`.
  - Minors worth fixing in the same wave: M1, browser Back to `?step=reveal` fires confetti again. M2, changing picks after the first Reveal looks saved and fires `prediction_made` although the server returns `saved: false` (lock the picks in the UI once revealed). M5, `path-view.tsx` duplicates `canSkip` (import it from `rules.ts`).
  - Minors to leave: M3 (`level_started` misses skip-first or Reveal-first starts), M4 (rollback snapshot), M6 (the opponent id comes from the client; low stakes, and it would need a user decision).
- Other notes: in Task 5 a subagent ran `taskkill /IM node.exe`, which stops every Node process. Tell subagents to stop only the PID they started. Toasts render twice in the DOM (visible text plus a status region), so e2e assertions use exact text.

## Step-6 - slice 5: finished (2026-10-02)

- The fix wave for I1, M1, M2 and M5 is done (no subagent: it was small, and ROADMAP Rule-A asks for lean token use).
  - I1: new `src/lib/use-server-state.ts` (state that adopts a fresh server prop, the "adjust state when a prop changes" pattern). `useSkipLevel` and `useLevelProgress` use it, so `refresh()` and revisits win over stale client state. `PathList` and `LevelStepper` are keyed by `session.userId`. A hook test must pass a stable prop object, or the resync loops (real server props are stable).
  - M1: `useCelebration(celebrate, onCelebrated)` reports once the confetti fired, and `RevealStep` passes `consumeCelebration`, so Back cannot fire it twice.
  - M2: Predict is locked after the first Reveal (radios disabled, button "Back to the race", no `lockIn`). If the server still answers `saved: false`, the hook restores the stored picks, toasts "Your picks are final" and tracks nothing.
  - M5: `path-view.tsx` imports `canSkip` from `rules.ts`.
- e2e: flow 1 goes Back, then the header Path link, and expects Done with no Skip. Flow 2 reaches Path through the header link and expects In progress. The replay test expects locked picks. `level-1.spec.ts` screenshot tests share one account that already revealed, so they skip disabled radios.
- Gates: lint, typecheck, format:check, check:env, check:secrets, check:standards 24/24, Vitest 411/411 plus node:test, check:rls, build and e2e 26/26 all pass.
- Left open: M3 (`level_started` for skip-first starts), M4 (rollback snapshot), M6 (the opponent id comes from the client; needs a user decision).
- Roadmap note: the user relabeled ROADMAP rules, so token use is now Rule-A and the $20 Anthropic credit is Rule-B. `CLAUDE.md`, spec, DESIGN and TECH-STACK still say "Rule-A" for the credit; ask the user before changing those references (Rule-3).
- The ledger `.superpowers/sdd/2026-10-02-slice-05-progress/` can be deleted.

Next: Step-6, slice 6 (levels 2-4). Carry in from slices 4 and 5: Jev + Code totals in Reveal and the judge for a combine task (level 3), and a `useRace` test with a combining task.

## Step-6 - slice 6: Levels 2-4 (2026-10-02) - done

- Skills: no writing-plans file and no subagents this slice (Rule-A; the work was one connected change). Gates were run by hand: lint, typecheck, format, check:env, check:secrets, check:standards 24/24, test (422 Vitest plus node:test), check:rls, build and e2e 33/33. The manual `local-review` pass was not run.
- User decisions: level 3 is four stacked races (fruits and dates, each asked directly and after the fix); level 4 has a rating form plus the usual race, with the calibration chart in Reveal. Recording approved after a dry run (estimate at most $0.53).
- Built:
  - Level files now list `tasks: [{ id, title, judged }]` (replaces `taskIds`) and an optional `widget`. Only judged tasks count toward the prediction; `judgedTotals` (in `judge.ts`) merges them through `mergeTotals` (`runner/totals.ts`) and is shared by Reveal and `revealPrediction`.
  - New prediction metric `delivers` (level 2: the runner's `correct` count).
  - `jevCodeRecording` (`runner/combine.ts`) derives Jev + Code from Jev's recording for Reveal. `answerText` reads its combined answer.
  - `PlayStep` and `RevealStep` take `stages` (`levelStages`, `sharedOpponentIds` in `lineup.ts`) and a widget slot. Level 4: `calibration/` (rating form, SVG chart with a table alternative, ratings kept only in page state) and `runner/calibration.ts`.
  - Recording CLI: a generate task's Jev run may be all `malformed` (level 2's expected rejection) and is still written.
  - Content: tasks `write-me-a-poem`, `fruits-direct`, `fruits-fixed`, `dates-direct`, `dates-fixed`, `how-sure`; levels `write-me-a-poem`, `count-and-dates`, `how-sure`; 24 recordings.
- Recorded results (real, unedited): spend this run $0.058, all recordings on disk $0.153 of $20.
  - Level 2: TypeSafe answers every call with a rejection (`Invalid request.`); all three Claude models write poems.
  - Level 3 fruits: Jev direct 2/4 (Haiku 0/4, Sonnet 0/4, Opus 1/4, mostly text around the JSON counted as a parse miss); Jev + Code 4/4. Dates: Jev and all three Claude models 4/4 directly, and Jev + Code 4/4, so the dates do not show a weakness. Level copy says so. If you want the lesson shown, the rule allows rewriting the date items once and re-recording, plus a Methodology note (spec 12.4); not done.
  - Level 4: Jev and all three models 10/10; the chart shows Jev's confidence buckets.
- Older e2e (`progress.spec.ts`) assumed one built level; it now expects 4 and scopes to level 1's card.
- Left open: the `useRace` test with a combining task (covered by `combine.test.ts` and the level 3 e2e instead), the manual local-review pass, and Rule-A/Rule-B relabel references in CLAUDE.md, spec, DESIGN and TECH-STACK (needs the user's OK).

Next: Step-6, slice 7 (levels 5-8: Break It Down, Router, Spot the Phish, Trick Jev). Level 5 uses `weighted_composite` with user weights; level 6 needs dnd-kit plus tap buttons.

## Step-6 - slice 7: Levels 5-8 (2026-10-02) - done

- Skills: no writing-plans file and no subagents (Rule-A). Gates by hand: lint, typecheck, format:check, check:env, check:secrets, check:standards 24/24, test (432 Vitest plus node:test), check:rls, build, e2e 42/42. The manual `local-review` pass was not run as a separate step.
- User decisions: Router shows a per-card result table (no race animation); Trick Jev asks the user to guess per pair whether Jev is fooled; all four levels in one session. The Router has 6 cards, not 8 (spec sets no count; DESIGN 7 updated).
- Built:
  - Level files `break-it-down`, `the-router`, `spot-the-phish`, `trick-jev`; 10 tasks; 40 recordings (Jev plus 3 Claude models). Spend this slice about $0.1; all recordings on disk well under the $20 credit.
  - Weights: `weights/` (sliders; the composite comes from the runner's `combineResult` with `CombineArgs`). `combineArgs` threads through `useRace`, `RaceStage`, `PlayStep`, `RevealStep` and `jevCodeRecording`.
  - Router: `router/` (dnd-kit core plus tap buttons, Code results from `codeRacer` in `useCodeResults`, results table). New Code function `sum_numbers`. The level schema gained `router` cards (`best` tool and `why` in content).
  - Signals (`signals/`, Reveal) and Tricks (`tricks/`, Play picker and Reveal results). Widget state lives in `level-widgets.tsx` (`useWidgetState`, `PlayWidget`, `RevealWidget`); the calibration widget moved there too.
  - `phish_spotter` badge (finish level 7). Methodology notes the level 8 rewrite.
- Recorded results (real): level 5 broad question 6/6 for all four racers; level 6 Jev, Haiku right on the sum, Sonnet and Opus parse misses on it, Jev rejects both text-writing cards; level 7 Jev 90% (1 of 3 emails fully right), Claude models 93-97%; level 8 second set: Jev 11/12 (fooled once, on the "how many days to cancel" wording at 55%).
- Honesty note (spec 12.4): level 8's first set did not fool Jev (12/12), so the items were rewritten once and recorded again; the old recordings were replaced. Methodology says so.
- Left open: `right_tool` and `trickster` badges (BADGE_LABELS ties them to games and the Arena, so they wait for those slices); the manual local-review pass; the Rule-A/Rule-B relabel references in CLAUDE.md, spec, DESIGN and TECH-STACK (needs the user's OK); the Router's keyboard drag path is not e2e-tested (tap buttons are).
- Older e2e (`progress.spec.ts`) now expects 8 built levels.

Next: Step-6, slice 8 (Developer mode: KeysProvider, Keys panel, OpenRouter/OpenAI/Google providers, `/api/jev`, CSP, live source in `useRace`). Level 8's Developer mode (user writes the trick) and the price-unknown display land there.

## Step-6 - slice 8: Developer mode (2026-10-02) - done

- Skills: no writing-plans file and no subagents (Rule-A; one connected change). Gates run by hand: lint, typecheck, format:check, check:env, check:secrets, check:standards 24/24, test (472 Vitest plus node:test), build, e2e 46/46. The manual `local-review` pass was read against the changed files; nothing blocking.
- User decision: Jev in Developer mode uses a TypeSafe key only. OpenRouter's `/api/v1/systemone` allows browser calls (preflight checked), but its request and response shape could not be verified without a real key (a fake key gets 401, and the only public model is `typesafe/jev-router`). OpenRouter is an LLM provider (chat completions, priced from its model list). To add Jev via OpenRouter later: paste a real OpenRouter key, send one request, and build the provider from the real response. DESIGN 5.2 and spec 3.4 say so.
- Built:
  - Providers (`src/runner/providers/`): `openai-compat.ts` (OpenAI and OpenRouter chat completions), `google.ts` (key in `x-goog-api-key`), `model-list.ts` (`fetchModels`, the Keys panel's Test), `callTypeSafe` takes the `/api/jev` URL and reads latency from `Server-Timing`.
  - `/api/jev` (`src/app/api/jev/route.ts`): session required, fixed upstream URLs, 256 KB cap, logs status and duration only. `export const runtime` is not allowed with `cacheComponents`; Node is the default.
  - `KeysProvider` (React state only, `keyId` per key), `ModeProvider` (not saved), Keys side sheet (Radix Dialog, Enter submits, `ph-no-capture`, Remove and Remove all, revoke links), header mode switch and Keys button, `useModelList` (query key is provider plus `keyId`), friendly error copy.
  - Live source: `useRace({ live })` runs `runItems` per racer, `stopOnProviderFailure` (`runner/live.ts`) stops on bad key, 403, rate limit, overload or network; the view shows the message with Retry and "Use Beginner mode instead". `useLiveSetup` picks the LLM from the user's key's model list. `ModeLabel` has the Developer form ("Developer mode - run 14:02 - model id").
  - CSP `connect-src` allowlist (`src/lib/csp.ts`, `next.config.ts`), checked on a production build.
  - Methodology paragraph on Developer mode costs and timing.
- Tests: provider, route, CSP, keys panel (including the no-storage check), `useRace` live and `stopOnProviderFailure` unit tests; `e2e/developer-mode.spec.ts` (flow 4 live race of 40 calls per racer against intercepted providers, key-storage and reload check, flow 8 rejected key with the Beginner fallback, phone width).
- Bugs found on the way: the React Compiler can't lower a computed key in a destructuring pattern (used a helper); the header overflowed on phones, so it now wraps; the level 1 e2e counted every radio on the page and caught the new mode switch.
- Left open (not built):
  - Level 6 router cards and level 8 "user writes the trick" still use recorded results in Developer mode; the Play step says so. Spec 3.4 says every level can run live, so decide whether to add them before Step-7.
  - Reveal always shows the recorded runs, even after a live run (the banner says so). Live results are not saved or shared.
  - `recordDevRun` (50 XP `dev_first_run`, `live_wire` badge) is not built; DESIGN 11.3 assigns it to a later slice.
  - Only Anthropic and OpenRouter models get a price; OpenAI and Google models show "price unknown" (their lists carry no prices). Add stored prices to `content/prices.json` if wanted.
  - No real provider key was used; the live paths were tested against intercepted responses. One real run per provider is worth doing at the PC (Keys panel, any level, Developer mode).
  - The Rule-A/Rule-B relabel references in CLAUDE.md, spec, DESIGN and TECH-STACK (needs the user's OK).

Next: Step-6, slice 9 (VS games P0 + Leaderboard).

## Step-6 - slice 9: VS games (P0) + Leaderboard (2026-10-02) - done

- Skills: no writing-plans file and no subagents (Rule-A). Gates by hand: lint, typecheck, format:check, check:secrets, check:standards 24/24, test (488 Vitest plus node:test), check:rls (7 tables), build, e2e 50/50 (run against `pnpm start` with `E2E_BASE_URL`, because the dev server hit a Turbopack panic, exit 0xc0000142, on this machine). The manual `local-review` pass was not run as a separate step.
- User decisions: record all 4 games now; Code appears in the Number Crunch summary (same runner), not as a third race lane (DESIGN 8 updated).
- Built:
  - Content: tasks `guardrail-gauntlet`, `needle-hunt`, `number-crunch` (v2), `review-score`; `content/games/*.json` (`game-schema.ts`, `games.ts`); 16 recordings; `solve_problem` Code function.
  - Pages: `/games`, `/games/[gameId]` (SSG), `/leaderboard`; header links Games and Leaderboard (hidden below `sm`, like Path) plus Home buttons.
  - Race code: `useRace` and `RaceStage` take `onFinished` and `scene`; `GameScene` draws chips (gate, lines, duel) or a rope from live race state; `GameSummary` shows winner, runner numbers, lesson, docs link.
  - Server: `LeaderboardEntry` table (migrations `leaderboard`, `leaderboard_rls`), `recordGameRun` (Beginner numbers recomputed from recordings; Developer numbers range-checked), `getLeaderboard`, `isBetterRun` (`src/runner/better-run.ts`). `game_done` XP (50) is Beginner-only and once per game and opponent; Developer runs only reach the user's own board. Speed Race also writes Leaderboard entries (no extra XP; level XP covers it). `gamer` badge: all 4 P0 games.
- Recorded (real): Guardrail Gauntlet all four 15/16; Needle Hunt Jev and Haiku 3/3, Sonnet 0/3 and Opus 1/3 (text around the JSON counts as a miss); Review Tug-of-War Jev 19/20, Haiku 18, Sonnet 16, Opus 20/20; Number Crunch Jev 10/12, Haiku 12/12, Sonnet 4/12, Opus 9/12, Code 12/12.
- Honesty note (spec 12.4): Number Crunch's first item set did not show Jev's weakness (Jev 12/12), so it was rewritten once (harder, v2) and recorded again; Methodology says so. Spend this slice about $0.1; all recordings on disk $0.357 of the $20 credit.
- Left open: the manual local-review pass; animations are chip and rope scenes, not the richer metaphors in spec 7.2 (gate, bouncers); the Number Crunch lesson wording is neutral because Jev did well; `right_tool` and `trickster` badges still wait for later slices; the Rule-A/Rule-B relabel references in CLAUDE.md, spec, DESIGN and TECH-STACK (needs the user's OK); the dev server Turbopack panic (if it repeats, restart the PC or use `pnpm start`).

Next: Step-6, slice 10 (Arena + Share): 8 presets (with the 3 tasks slice 13 reuses), custom task, model picker, share consent, `createShare` and `deleteShare`, `/s/[shareId]`.

## Step-6 - slice 10: Arena + Share (2026-10-02) - done

- Skills: no writing-plans file and no subagents (Rule-A; one connected change). Gates by hand: lint, typecheck, format:check, check:env, check:secrets, check:standards 24/24, test (522 Vitest plus node:test), check:rls (8 tables), build, e2e 54/54 (run against `pnpm start` with `E2E_BASE_URL`, as in slice 9). The manual `local-review` pass was not run as a separate step.
- User decision: record the 3 new tasks after a dry run (worst case $0.75). Real spend $0.09; all recordings on disk $0.448 of the $20 credit.
- Built:
  - Content: tasks `product-match` (16 pairs), `citation-check` (12 claims with sources), `intent-routing` (12 voice commands, 6 devices) with 12 recordings, ready for the P1 games in slice 13; `content/arena/presets.json` (8 presets, each names one item of a task; `src/content/arena.ts` is server-only and ships only that item's recorded results to the client, R79).
  - Presets: ticket triage (item t35), prompt-injection check (m2), review rating (r10), product match (p02), citation check (c02), intent routing (v11), date comparison (d4, from `dates-direct`; DESIGN says "date extraction", which would need a new task, so it is named "Date comparison"), phishing signals (e1).
  - `/arena` (`?preset=`): Beginner replays Jev and the chosen Claude model side by side, each answer appearing after its recorded latency, with probabilities, confidence, latency, cost, mode label and "Couldn't parse" plus raw text. The first replay of a preset earns 10 XP once (`recordArenaRun`, Beginner only). Developer mode edits the preset input (an edited input is not scored), has a "Custom task" tab (Yes/no, Choice or Score; no stored answer) and runs live through the same `jevRacer` and `llmRacer`.
  - Share: `Share` table (migrations `share`, `share_rls`), `createShare` (Beginner: the client sends ids and the server builds the snapshot from the recordings; Developer: Zod-validated snapshot capped at 32 KB, consent required when it holds the user's own text, checked on the server by comparing with the preset's input; 20 per user per day counted from rows; the `sharer` badge via `grantBadge`), `deleteShare`, `/s/[shareId]` outside the `(app)` layout (no header, noindex in metadata and `X-Robots-Tag`, "Sign in to try it yourself"), "Your shared results" list with delete confirm on `/arena`. Header Arena link and a Home button.
- Finding: `'use cache'` + `cacheTag` + `updateTag` on a production build still served a deleted share once to the next browser request (reproduced with a probe; the second request was fresh). R87 needs the link dead at once, so `getShare` is a plain per-request read under `<Suspense>` with `connection()`, and there is no `updateTag`. CLAUDE.md, DESIGN 5/11 and TECH-STACK were updated to say so (the old text said cached SSR). Flow 5 now proves the dead link on the first reload.
- Left open: `trickster` badge ("Fool Jev in the Arena": a Developer result is client-reported, so it needs a user decision) and `right_tool` (games); `recordDevRun`/`live_wire` still not built; Arena batch mode is slice 14; the manual local-review pass; the Rule-A/Rule-B relabel references in CLAUDE.md, spec, DESIGN and TECH-STACK (needs the user's OK).
- For slice 11 (Sandbox): `AnswerView` (`src/features/arena/answer-view.tsx`) already renders Choice and Score probabilities as bars, Noul as a bar, and boolean maps; `custom-task.ts` builds a one-question task from form input. Reuse them for the Sandbox's visual answers instead of writing new ones.
- For slice 12 (Profile): reuse `MyShares` (`src/features/arena/my-shares.tsx`) with `getMyShares` for "my shares".

Next: Step-6, slice 11 (Sandbox).

## Step-6 - slice 11: Sandbox (2026-10-02) - done

- Skills: no writing-plans file and no subagents (Rule-A; one connected change). Gates by hand: lint, typecheck, format:check, check:env, check:secrets, check:standards 24/24, test (540 Vitest plus node:test), build, e2e 61/61 (against `pnpm start` with `E2E_BASE_URL`). The manual `local-review` pass was not run as a separate step.
- Built:
  - New task kind `sandbox` (`TASK_KINDS.sandbox`): Jev only, any mix of questions, never scored. `scripts/record/targets.ts` records only Jev for it, and `registry.test.ts` expects only a Jev recording. Six tasks `sandbox-*` plus `content/sandbox/templates.json` (words only; `src/content/sandbox.ts` is server-only and builds the views). `sideOf` in `arena.ts` is now exported and reused.
  - `src/features/sandbox/`: `doc.ts` (one setup object for the Form and the JSON view, `bodyToDoc`, `buildSandboxTask`), `checks.ts` (limit check from characters / 4, blocks the send; weakness warnings for counting, math, dates, text generation, long state), `snippets.ts` (curl and TypeScript with a key placeholder), `synced-textarea.tsx` (keeps typed text while the setup adopts outside edits), `form-editor`, `json-editor`, `checks-panel`, `code-panel`, `run-panel`, `use-sandbox-run`, `sandbox-workspace`, `sandbox-view` (`?template=`, `blank`).
  - `/sandbox` page, `ROUTES.sandbox`, header link and a Home button. Beginner mode replays an unchanged template at the recorded latency; an edited setup shows why it cannot run. Developer mode runs through `jevRacer` and `/api/jev` with the TypeSafe key only (user decision from slice 8); a rejection shows Jev's raw reply plus a plain note.
- Recorded (real, Jev only, no Anthropic spend; all recordings on disk still $0.448 of the $20 credit): support ticket, spam check, review rating, resume fit, moderation, counting trap. Jev got the counting trap's list right (8 kinds), so its lesson says "may get it right, never rely on it".
- Finding: Supabase rate-limits sign-ins ("Too many attempts"), so a full e2e run with many `signIn` calls fails in a cluster. The sandbox spec signs up once and reuses one page. If the full suite fails on `toHaveURL('/')`, wait a minute and rerun.
- Left open: the manual local-review pass; `right_tool` and `trickster` badges; `recordDevRun`/`live_wire`; Noul criteria and Choice option descriptions are kept by the JSON view but have no Form fields; Sandbox runs award no XP; the Rule-A/Rule-B relabel references in CLAUDE.md, spec, DESIGN and TECH-STACK (needs the user's OK).
- For slice 12 (Quizzes + Profile): reuse `MyShares` with `getMyShares`.

Next: Step-6, slice 12 (Quizzes + Profile).

## Step-6 - slice 12: Quizzes + Profile (2026-10-02) - done

- Skills: no writing-plans file and no subagents (Rule-A; one connected change). Gates by hand: lint, typecheck, format:check, check:env, check:secrets, check:standards 24/24, check:rls (9 tables), test (Vitest plus node:test), build, e2e (against `pnpm start` with `E2E_BASE_URL`, as in slices 9-11). The manual `local-review` pass was not run as a separate step.
- Decisions I made without asking (small, reversible; say so if you want them changed):
  - Each quiz is scored once per user (the first submit; `QuizAttempt` is keyed by user and quiz). There is no retake, so XP, the improvement and the `quiz_climber` badge all read the same attempt.
  - Solutions show only after a quiz is submitted, so reading them cannot spoil the quiz. The answers never reach the browser before that (the taker gets prompts only).
  - The quiz answer is one of Jev, an LLM or Code, so a question has no `options` array (DESIGN 4.1 and 11.1 updated).
  - Jev's wins and losses on the completion card count every metric a finished level asks (speed, cost, accuracy, or "delivers"), Jev against the opponent the user raced, from the recordings. Ties count for neither.
- Built:
  - Content: `content/quizzes/start.json` and `end.json`, 8 questions each, one per level topic, different items (written by Claude from each level's lesson; spot-check them). `src/content/quiz-schema.ts`, `quizzes.ts` and a test that each quiz covers every level once.
  - Database: `QuizAttempt` (migrations `quiz`, `quiz_rls`; `check:rls` passes on 9 tables). `submitQuiz` (`src/server/actions/quiz.ts`) scores on the server (`src/server/quiz/score.ts`), stores the attempt, pays 10 XP per right answer once (`quiz:question` source ids) and syncs badges. `quiz_climber` is now awarded (end score above start score, in `rules.ts` and `syncBadges`).
  - Pages: `/quizzes`, `/quizzes/[quizId]` (SSG shell; per-user part under Suspense: the taker when not taken, the results when taken), `/profile` (XP, badges grid with earned dates, quiz improvement, completion card, `MyShares`). `ROUTES.quizzes`, `quiz`, `profile`; header links Quizzes and Profile; Home buttons "Take the start quiz (optional)" and "Your profile". `quiz_completed` analytics event (quiz id and score only).
  - Completion card: `src/server/progress/jev-record.ts` and `src/server/data/profile.ts`; shown once the `pathfinder` badge exists, otherwise a "finish all levels" note.
- Tests: quiz content, scoring, `submitQuiz`, badge rule, `jevRecord`, improvement helper; `e2e/quizzes.spec.ts` (flow 7: start quiz with Enter and Back, results, reload keeps results, end quiz, improvement, Profile XP and badge, screenshots in both themes at desktop and phone width). The fake DB in `src/server/testing/fake-progress-db.ts` gained `quizAttempt`.
- Left open: the completion card with a finished path is covered only by the `jevRecord` unit test (no e2e plays all 8 levels); sign out sits in the header only, not on Profile; the header links are still hidden below `sm` (Profile and Quizzes are reachable from Home on phones; the phone menu from DESIGN 6 is not built); `right_tool`, `trickster` and `live_wire` badges still wait for later work; the manual local-review pass; the Rule-A/Rule-B relabel references in CLAUDE.md, spec, DESIGN and TECH-STACK (needs the user's OK).
- Every P0 row in spec 15 is now built (slice 12's exit criterion), except the open items above.

Next: Step-6, slice 13 (VS games P1: Smart Home Dash, Twin Finder, Confidence Catch, Citation Cop). Their tasks `product-match`, `citation-check` and `intent-routing` are already recorded (slice 10).
