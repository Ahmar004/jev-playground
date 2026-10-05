# Progress

## Current state (read this first; update it at the end of every step)

Read only this block and the sections a step needs (Rule-0.0). The dated entries below it are the full history; nothing in them is removed.

**Goal (Rule-0.01):** launch to TypeSafe's Discord community (100k+ people) on Vercel at the free `vercel.app` URL, with no custom domain. The app must be fast, scalable, reliable and secure. There is no deadline. Budget: 10,000 PKR. Anthropic credit: about $19.46 left (Step-15's live check spent about $0.011), and recordings so far cost $0.49.

**Built (Steps 0-34, all done; Step-16 skipped real-key checks of OpenAI, Google and OpenRouter-as-LLM for lack of keys; Step-17 was blocked first and finished later the same day, see its "done" entry):**

- All 8 levels, 8 VS games (4 P0, 4 P1), Arena with presets, batch mode and share links, Sandbox, start and end quizzes, XP, badges, completion card, Leaderboard, Glossary and Methodology.
- Beginner mode replays 31 recorded tasks. Developer mode supports Jev through a TypeSafe key or an OpenRouter key (TypeSafe wins when both are set), and LLMs through Anthropic, OpenAI, Google and OpenRouter (Step-17).
- After a Developer mode run, Reveal shows the last finished live run beside the recordings (races, level 6 cards, level 8 tricks), labelled; tab memory only.
- `content/prices.json` prices Jev, the Claude models and every OpenAI and Google text model (57 entries, checked 2026-10-04; Step-17 added the dated OpenRouter Jev build on 2026-10-05); OpenRouter models use OpenRouter's live list.
- Tests: 754 Vitest, 114 node:test and 114 Playwright e2e, covering every flow in DESIGN 15.
- k6 locally (2026-10-05): 400 users median 214 ms, p95 583 ms, target met; 1,000 users median 6.7 s, p95 10.1 s, no failed requests but the target is missed (one Node process is CPU-bound at about 86 pages a second).
- The public README.
- Every VS game has its own scene (Steps 33 and 34), drawn from the race state only: gate, document, duel and rope for the P0 games; runners, belts, falling answers (with the live threshold slider) and checkpoint for the P1 games. `docs/runbook.md` and a PostHog funnel cover launch operations (Step-32).
- SEO and link previews (Step-31): every page has a title, the root layout sets the description and the Open Graph and Twitter card, `src/app/opengraph-image.tsx` draws the 1200x630 image, and `robots.txt` and `sitemap.xml` are built from `NEXT_PUBLIC_APP_URL`.
- Real keys checked (Step-15): TypeSafe and Anthropic, level 1 live on localhost, every call 200 with no shape fixes needed. A provider call now times out after 60 s (`PROVIDER_TIMEOUT_MS`) and stops the run with a `timeout` error; `/api/jev` answers 504 on a hung TypeSafe call.

**Open (ROADMAP Steps 0-34 are done; these are the loose ends):**

- Promotional prices end: gpt-5.6-sol on 2026-11-21, gemini-3.6/3.7/3.8-flash on 2026-12-31. After that those models show "price unknown" until someone rechecks the pricing pages and updates `content/prices.json`.
- No real-key test for OpenAI, Google or OpenRouter as an LLM (Step-16 skipped them: no keys). Jev through OpenRouter was checked live in Step-17. Level 8's live trick was checked live in Step-20.
- Lighthouse mobile: LCP is 4.2 to 4.4 s on four pages and 6.6 s on a Level (simulated slow phone); the real page is fast (0.4 to 0.8 s here). Getting the simulated LCP under 2 s needs a much smaller initial JavaScript bundle (see Step-27).
- The production Supabase project exists, its schema is applied and Confirm email is off (the owner did it). The app is live at https://letsplaywithjev.vercel.app (Vercel project `ahmar9/jev-playground`, function region iad1); production reports to its own Sentry project and shares the one free PostHog project.
- No password reset (it needs a domain, and none is bought).

**Pitfalls:** see CLAUDE.md "Known pitfalls".

**Next:** nothing is left in ROADMAP. Step-31 and Steps 32-34 are built and verified locally but only show on the live URL after the owner redeploys; then paste the live URL into a Discord channel and check the card. Remaining ideas are the loose ends above (a smaller initial bundle for Lighthouse, a manual accessibility pass).

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

## Step-6 - slice 13: VS games (P1) (2026-10-02) - done

- Skills: no writing-plans file and no subagents (Rule-A; one connected change). Gates by hand: lint, typecheck, format:check, check:env, check:secrets, check:standards 24/24, test (557 Vitest plus 114 node:test), build, e2e 65/65 (against `pnpm start` with `E2E_BASE_URL`, as in slices 9-12). The manual `local-review` pass was not run as a separate step.
- User decision: record Confidence Catch after the dry run (upper bound $0.37). Real spend $0.044; all recordings on disk $0.492 of the $20 credit.
- Built:
  - Four games in `content/games/` (all `p1`): `smart-home-dash` (task `intent-routing`), `twin-finder` (`product-match`), `citation-cop` (`citation-check`), `confidence-catch` (new task `confidence-catch`: 20 customer messages, Choice among billing / technical / shipping, written by Claude, spot-check them). Smart Home Dash, Twin Finder and Citation Cop reuse the slice 10 recordings, so nothing was re-recorded for them.
  - New `GAME_ANIMATIONS` values `runners`, `belts`, `fall`, `checkpoint`; `GameScene` labels chips per animation (device, "Pair n", "Claim n", answer).
  - Confidence Catch's slider: `src/runner/threshold.ts` (`jevChoicePoints`, `splitByThreshold`, tested) and `ThresholdPanel`. It re-sorts Jev's recorded answers into acted right, acted wrong and sent to a person. It runs nothing, and shows only in Beginner mode after the race (a live run has no stored Jev confidences in the view).
  - Games, Leaderboard and `recordGameRun` are generic, so the P1 games write entries with no server change. The `gamer` badge and `game_done` XP still look at P0 only for the badge; P1 games earn the 50 XP once per game and opponent like P0 games.
- Recorded (real): Confidence Catch Jev 20/20 (confidence 0.46-1; lowest on the ambiguous messages), Haiku 19/20, Sonnet 19/20, Opus 19/20. Jev is fastest (2.2 s vs 4.5 s, 9.7 s, 14.1 s) and cheapest. Because Jev got all 20 right, a high threshold only sends right answers to a person; the copy says the slider re-sorts recorded answers and does not claim a safety gain.
- Tests: `threshold.test.ts`; `e2e/games.spec.ts` plays all four P1 games, checks their Leaderboard sections and drives the slider.
- Left open: the manual local-review pass; no screenshots checked for the new scenes in both themes; animations are chip scenes, not the richer metaphors in spec 7.2; `right_tool`, `trickster` and `live_wire` badges; `recordDevRun`; the Rule-A/Rule-B relabel references in CLAUDE.md, spec, DESIGN and TECH-STACK (needs the user's OK).

## Step-6 - slice 14: Arena batch mode (2026-10-02) - done

- Skills: no writing-plans file and no subagents (Rule-A; one small change). Gates by hand: lint, typecheck, format:check, check:secrets, check:standards 24/24, test (558 Vitest plus 114 node:test), build, e2e (new `e2e/arena-batch.spec.ts` 2/2 and `arena.spec.ts` against `pnpm start` with `E2E_BASE_URL`). The manual `local-review` pass was not run as a separate step.
- User decision: batch mode reuses each preset's existing recorded task (no new 25-item tasks, $0 spend). Spec and DESIGN 9 said "25-item batch task"; DESIGN 9 now says what is built.
- Built:
  - `/arena/batch/[presetId]` (SSG, `generateStaticParams` from `batchPresetIds()`), `BatchPlay` (`src/features/arena/batch-play.tsx`): the race view over the whole task, Beginner replay with the opponent picker or Developer live via `LiveRaces`, plus the preset's lesson. Nothing is saved, shared or scored for XP.
  - Batch is offered when the task has at least `ARENA_BATCH_MIN_ITEMS` (12) items: ticket triage (40), prompt-injection (16), review rating (20), product match (16), citation check (12), intent routing (12). Date comparison (4) and phishing (3) have none. `ArenaPresetView.batchItems` drives the "Run all N items as a batch" link in the Arena; `ROUTES.arenaBatch`; `batchView` in `src/content/arena.ts` ships only that task's recordings to the page (R79).
- Left open: the manual local-review pass; no screenshots checked for the batch page in both themes; `right_tool`, `trickster` and `live_wire` badges; `recordDevRun`; the Rule-A/Rule-B relabel references in CLAUDE.md, spec, DESIGN and TECH-STACK (needs the user's OK).
- Run `corepack pnpm exec next typegen` after adding a route if `PageProps<...>` types error in typecheck.

Next: Step-6 is complete after slice 14. Then Step-7 (hardening: systematic-debugging, e2e for every flow, the k6 load test published on Methodology). Worth deciding before then: level 6 and 8 Developer mode live runs, the missing badges and `recordDevRun`.

## UI overhaul (owner request, 2026-10-02) - done

- Not a ROADMAP step: the owner asked for it directly, between Step-6 and Step-7. No skill named; no subagents. Gates: format:check, typecheck, lint, check:env, check:secrets, check:standards 24/24, test (561 Vitest plus 114 node:test), build, e2e 68/68 against `pnpm start` with `E2E_BASE_URL`. The manual `local-review` pass was not run as a separate step.
- What changed, and where:
  - Tokens (`src/app/globals.css`, DESIGN 13.1): light `--bg` is now a clear cream (#F3E5C8) with near-white surfaces (#FFFBF3); dark is near-black (#0F1216 / #181C22). Spec 11 updated to match (the owner asked for a darker dark). `theme-tokens.test.ts` passes for both themes.
  - Shadows: `shadow-card` / `shadow-card-hover` (`--elev-1` / `--elev-2`) on every surface card, popover, dialog and toast. A one-off script added them to every class string with `bg-surface rounded-lg border`; new cards must add `shadow-card` by hand (or use `Card`).
  - Type scale one step up (xs 13, sm 15, base 17 px) in `@theme`, so every `text-xs`/`text-sm` grew at once. Buttons grew a step to fit.
  - Header (`src/features/shell/`): one row at every width (an e2e test checks height and that the nav ends before the progress bar at 1280 px). The lightning logo is gone from it (still on the sign-in page and as Jev's racer icon). Links show from `xl`; `side-nav.tsx` is a left drawer with every page (plus progress on phones); `account-menu.tsx` is a profile button whose popover shows the email, "Your profile" and Sign out. Nav data is in `nav-items.tsx` (tested).
  - Animations: page blocks rise in on every navigation (`src/app/(app)/template.tsx` + `.page-enter`), which also animates level step changes; Radix dialogs, popovers and toasts animate in and out through `data-state` classes; buttons press and lift; link cards lift (`Card` with a direct `<a>` child); skeletons shimmer (`.skeleton`); progress bars grow; quiz questions slide in with a gradient progress bar; busy race lanes pulse. These are CSS keyframes, not Motion, because they run in Server Components and on Radix's own mount/unmount. A global `prefers-reduced-motion` rule stops them all.
  - Hues: racer-color glows behind every page, gradient brand text, hued icon tiles on Home and in the sidebar, numbered level badges on Path colored by status (the status label still says it in words), racer-colored top edges on race lanes, colored toast edges.
  - Home is redesigned: a hero card and a tile grid with the same link names as before (e2e depends on them).
- Fixed on the way: the Router reveal cards overflowed phones by 6 px once text grew (`min-w-0 wrap-anywhere`).
- Pitfall: `TaskStop` on `corepack pnpm dev` leaves the node server running on port 3000. Kill it by port (`Get-NetTCPConnection -LocalPort 3000`) before `pnpm start`, or e2e runs against a dev server whose `.next` the build just replaced (15 bogus failures).
- Pitfall: Python `open(..., 'w')` on Windows writes CRLF; pass `newline=''` when scripting edits.
- The Chrome extension was not connected this session, so screens were checked with Playwright screenshots (both themes, 1280/1024/390/360 px).
- Left open: everything listed under slice 14.

Next: Step-7 (hardening), as before.

## UI follow-up: hues (owner request, 2026-10-02) - done

- Sign-in: three large blurred hue blobs drift slowly behind the form (`.hue-blobs` in `globals.css`); stronger in light, softer in dark.
- Dark mode hues: the page glows, Home hero blobs and sign-in blobs now read `--hue-1/2/3`, which are the racer colors in light (unchanged look) and calmer teal #2A9D94, slate blue #4A64B8 and green #2F7D52 at lower strength in dark. Dark drops the purple from the brand gradient text, the header line and the avatar ring. Light theme is unchanged.
- Gates: format:check, typecheck, lint, check:standards, check:secrets, test (561 Vitest plus 114 node:test), build, e2e 68/68 against `pnpm start`.

## UI follow-up: hues in the app (owner request, 2026-10-02) - done

- The owner liked the sign-in hues and asked for them on every in-app page, a bit softer. `HueBackdrop` (`src/components/hue-backdrop.tsx`) now draws them: `strong` on sign-in, `soft` (about 20% instead of 30-35%) and `fixed` behind the whole app shell in `src/app/(app)/layout.tsx`, so they stay in view while scrolling. Both themes use the `--hue-*` tokens.
- Full-page e2e screenshots show the fixed hues only in the first screen, and a page grabbed the moment its text appears can still be fading in (Playwright counts opacity 0 as visible). Both are screenshot artifacts, not bugs.
- Gates: format:check, typecheck, lint, build, e2e 68/68 against `pnpm start`.

## UI follow-up: hue tuning, centering, light default (owner request, 2026-10-02) - done

- Hues: dark is stronger (sign-in blobs 45%, in-app blobs about 30%, page glow 14%); light swaps purple and orange (orange top-right, purple at the bottom) and the in-app blobs drop to 12-15%. Light sign-in keeps its strength.
- Narrow pages (Path, Quizzes, a quiz, Leaderboard, Profile, Glossary, Methodology, a Level) center their column with `mx-auto w-full max-w-*` instead of hugging the left edge of the 6xl shell.
- New visitors get the light theme (`defaultTheme="light"`, no system theme; the toggle only offers light and dark).
- Home's progress card spans the hero's width and is compact (title, levels done with the bar, and XP on one row) so the footer fits on a desktop first screen. Not yet confirmed in a browser: the Chrome extension was disconnected all session.
- A `pnpm start` server serves the last build, so UI changes need `pnpm build` before they show.
- Gates: lint, typecheck, format:check, check:env, check:secrets, check:standards, check:rls, test (561 Vitest), build.

## UI follow-up: footer, dark text hues, avatar ring (owner request, 2026-10-02) - done

- From the session before Step-7, left uncommitted; Step-7 committed it as its own commit. The footer is shorter (`py-2`, 12 px links); dark mode's gradient text runs green to gold (`#8ad98c` to `#ecc56a`) and the bottom hue is the same gold; the background hues pulse slowly (14 s, reduced motion stops it); light and dark hue strengths match (sign-in 38%, in-app 30/30/24%); the line under the header and the ring around the account button are gone.

## Step-7 - hardening (2026-10-02) - done

- Skill: systematic-debugging (read by hand from the superpowers cache). No subagents (Rule-A). The Chrome extension was connected, so screens were checked on localhost through it (Rule-11).
- Baseline before any change: lint, typecheck, format, 561 Vitest plus node:test, build, e2e 68/68. Every flow in DESIGN 15 already had an e2e test.
- Bugs found and fixed (root cause first, test first):
  - **Database pool capped throughput.** The first 1,000-user load test served only 33 pages a second with a 24 s median and 0 failures. The server used 35-60% of one core, so it was waiting, not working. Probe: one DB round trip from this PC to Supabase (Mumbai) is 76 ms, every page runs at least 3 queries (the header's progress), and node-pg's default pool of 10 caps that at about 38 pages a second; a pool of 40 gave 117. Fix: `POOL_MAX_CONNECTIONS = 40` in `src/server/db/client.ts` (the free Supavisor pooler takes 200 clients). Throughput went to 87 pages a second; after that the limit is one Node process's CPU (110-125% of a core).
  - **A failed live run still reported a finish.** `useRace` called `onFinished` after a run stopped on a bad key or rate limit, so a failed Developer mode run of Speed Race or a VS game saved partial numbers to the Leaderboard and showed a summary. Now only a completed run reports (unit test, plus the flow 8 e2e checks no save toast appears).
  - **Three badges could never be earned.** Right Tool, Trickster and Live Wire showed on Profile, but nothing awarded them, and two descriptions disagreed with DESIGN 10. Built (user decisions this session):
    - `right_tool`: level 6's first "Run the pipeline" sends the sort; the server checks it against the content.
    - `trickster`: level 8's six guesses go with the first Reveal; the server checks all six against Jev's recording (only pair 4 fooled Jev). User chose "all 6 right" over "spot one" (gameable) or "finish level 8".
    - Both use `submitFirstPlay` and the new set-once column `LevelProgress.firstPlay` (migration `level_first_play`); a play after Reveal, or a second play, counts for nothing.
    - `live_wire` plus 50 XP `dev_first_run`: `recordDevRun`, called by `useRecordDevRun` when a live race, an Arena run or a Sandbox run finishes.
    - Descriptions now say exactly what earns each badge; Gamer names its four games (the Games page does not mark which four count).
  - **Owner feedback:** Predict and Check questions sat on their card's top border (a `legend` on a bordered `fieldset`). New `QuestionCard` primitive (`src/components/ui/question-card.tsx`) used by Predict, Check and the quiz taker. Each level's Predict step now opens with `predict.intro` (content and schema): what races, on what, how many items. Vague prompts ("Who is faster?") name what they compare. Unclear Check questions were rewritten (level 8's "How do you make Jev harder to trick?" and five more); the 16 quiz questions were reviewed and left as they were.
- k6 load test (R78): `load/journey.js`, `load/session.mjs`, `docs/load-test.md`, scripts `load:session` and `load`. Methodology's new "Load test" section reads `load/results-1000.json` and `load/results-400.json` (Zod-checked at build). Both runs were made on the final build with the PC otherwise idle. 1,000 people at once: 21,807 pages, 0 failures, 91 pages a second, median 6.2 s, p95 7.4 s (too slow: one Node process is CPU-bound). 400 people: 19,299 pages, 0 failures, median 266 ms, p95 703 ms (targets met). k6 is not on PATH here: a portable `k6.exe` (v2.3.0) was used from the session scratchpad; install it with `winget install k6 --source winget`.
  - **Flaky flow 5 e2e** (1 in 6 runs under parallel load): the test reloaded the deleted share before the delete had landed. While Radix's confirm dialog is open it hides the page from the accessibility tree, so the "link gone from the list" check passed early. Proved with logging (the server read still found the row), not a product bug: the test now waits for the "Share deleted" toast. 16 of 16 repeats pass.
- Checked, not bugs: unknown level, game, quiz and batch URLs show the not-found card; an unknown Arena preset falls back to the first one; XP, badges, quiz attempts and Reveal are guarded by unique keys, so double clicks can't double-award; a level page that looked blank in a screenshot had loaded in 0.63 s (the rise-in animation was mid-way).
- Gates: lint, typecheck, format:check, check:env, check:secrets, check:standards 24/24, check:rls (9 tables), test (114 node:test plus 582 Vitest), build, e2e 68/68 against `pnpm start`. The manual local-review pass found nothing blocking.
- Pitfalls: a load test run while Vitest or a build runs measures the CPU contention, so rerun it on an idle PC. `next build` replaces `.next` under a running `pnpm start`; stop the server first.
- Left open: level 6 and 8 still use recorded results in Developer mode; Arena "trickster" in Developer mode is not a thing any more (the badge is level 8's); the Rule-A/Rule-B relabel references in CLAUDE.md, spec, DESIGN and TECH-STACK (needs the user's OK); the untracked `.superpowers/` folder from an earlier session is not committed; the e2e "dark" screenshots render light since the light default (next-themes ignores the emulated color scheme now) and many are taken mid rise-in animation, so they prove little. Wait about 1.5 s and set the `theme` local storage key to check screens by screenshot, as this session did.

Next: Step-8 (README for submission, plus the Loom talking points).

## Step-8 - README (2026-10-03) - done, not committed

- Owner decision: the README is for the public (users and contributors), not the 8x submission, and has no Loom outline.
- `README.md` replaces the 8x template README. It covers what the app does, the two modes and key handling, how the runner works, the stack, local setup, scripts, test and load numbers, trade-offs and known gaps, how AI built it, and a map of the docs.
- Not run: `prettier --check README.md` fails here because `prettier-plugin-tailwindcss` is missing from this copy's `node_modules`. Run `corepack pnpm install`, then `format:check`, before the commit.
- Rule-0.01 is now the global launch (TypeSafe Discord, 100k+ people): fast, scalable, reliable, secure.

## Step-9 and Step-10 - docs and repo hygiene, current state (2026-10-04) - done, not committed

- Done in the same session as Step-8 at the owner's request, docs only; the app is unchanged.
- ROADMAP (approved by the owner): Rule-0.3 (10,000 PKR, Rule-0.1, personal repo), Rule-1 (no deadline) and Rule-9 (Vercel at the free `vercel.app` URL, no custom domain) updated. Steps 9-35 appended (Step-30, the serverless database pool, was added after the first draft at the owner's request). The proposed "domain, Resend and password reset" step was dropped by the owner, and Steps 28, 29 and 31 say what follows from having no domain: email confirmation stays off, and Open Graph and the sitemap use the `vercel.app` URL.
- Stale references fixed in CLAUDE.md, spec.md (3.3, 14), DESIGN.md (4.2), TECH-STACK.md (constraints, password reset, Vercel readiness) and docs/rules/deployment.md. `.superpowers/` is untracked (files kept on disk) and gitignored.
- CLAUDE.md gained a "Known pitfalls" section, a session-start reading rule, the no-domain rule, and a rule to update README.md when a step changes what is built.
- Added the "Current state" block at the top of this file.

## Step-11 - level 6 in Developer mode (2026-10-04) - done

- Skills: test-driven-development (read by hand), local-review. No subagents, no Anthropic spend (every test uses intercepted providers).
- Built: in Developer mode the Router's "Run the pipeline" runs every card live. `router/use-live-router.ts` runs each card's first item for Jev and the LLM through `liveRunners` (`jevRacer`/`llmRacer` plus `stopOnProviderFailure`, now in `race/live-config.ts`), RACE_LANES calls at a time per tool, 12 paid calls in all. Code still runs in the browser. `router/router-live-play.tsx` adds the setup panel, a progress note ("Running live: n of 12 calls done"), the results and the failure alert, and remounts when the model changes so no result carries another model's label.
- Every Router result now shows a mode label: "Beginner mode - recorded <date> - <model>" or "Developer mode - run <time> - <model>" (`ToolOutcome.source`). `RouterResults` takes `outcomesFor`, so recorded and live results share one view.
- Refactors: `LiveFailureAlert` extracted from `RaceStage`; `liveModelId` helper. The Play step's "still uses recorded results" notice for level 6 is gone.
- Reveal still shows the recorded runs after a live run (Step-13). Live results reset when the user leaves Play, the same as the live races.
- Tests: `use-live-router.test.ts` (7), live and recorded labels in `level-widgets.test.ts`; e2e `developer-mode.spec.ts` level 6 live run (6 Jev plus 6 LLM calls, 12 labels, Jev's real rejection of the writing cards shown as a miss) and a rejected-key stop with the Beginner fallback. The e2e Jev fake now rejects text questions with the 400 the real Jev sends, and answers Noul questions.
- Gates: lint, typecheck, format:check, check:env, check:secrets, check:standards 24/24, check:rls, test (114 node:test plus 591 Vitest), build, e2e developer-mode 6/6 and levels-5-8 9/9 against `pnpm start`.

## Step-12 - level 8 in Developer mode (2026-10-04) - done

- Skills: test-driven-development (tests written first, by hand), local-review. No subagents, no Anthropic spend (intercepted providers only).
- User decisions: the writer goes above the recorded pairs, which stay, so Reveal and the Trickster badge work as before; only Jev answers the user's trick (TypeSafe key only).
- Built: `tricks/use-live-trick.ts` (one call per attempt, newest first, `lastInput` for Retry, abort on unmount, text up to `TRICK_TEXT_MAX` 2000 chars), `tricks/trick-writer.tsx` (pure form: Enter submits, Shift+Enter adds a line; each attempt shows "You fooled Jev" or "Jev saw through it", Jev's % yes, the outcome, latency and cost, the Developer mode label), `tricks/trick-live-play.tsx` (binds `jevRacer` plus `stopOnProviderFailure`, records the dev run for `live_wire`). `pairs.ts` gained `jevProbability` and `trickFooled` (a miss, parsed or not, counts as fooled, R44). `useLiveSetup` now exposes `jev` (call plus model id) without needing an LLM key.
- The attempts reset when the user leaves Play, like the live races; Reveal does not show them (Step-13 decides).
- Tests: `use-live-trick.test.ts` (11), `trick-writer.test.tsx` (6); e2e `developer-mode.spec.ts`: a live trick that fools the fake Jev plus an unparsed reply shown as a miss with its raw text (2 calls, no retries), and a rejected TypeSafe key with the Beginner fallback. The e2e Jev fake takes `jevStatus` and `jevAnswer` options.
- Gates: lint, typecheck, format:check, check:env, check:secrets, check:standards 24/24, check:rls, test (114 node:test plus 608 Vitest), build, e2e developer-mode and levels-5-8 17/17 against `pnpm start`.

## Step-13 - live results in Reveal (2026-10-04) - done

- Skills: test-driven-development (tests first, by hand), local-review. No subagents, no Anthropic spend (intercepted providers only).
- User decisions: all three kinds of live run go to Reveal (races, level 6, level 8); only the scoreboard numbers, not the per-item list; a run stays until a new finished run replaces it or the user leaves the level, and keeps its Developer mode label after a switch to Beginner mode.
- Built: `RaceResult` now carries `recordedAt` and `mode` and includes Jev + Code (`raceResults` is exported and tested); `gameRunInput` sends only Jev and the LLM. `LevelStepper` keeps the last finished live race per task and `RevealStep` puts those rows above the recorded ones, with a note that the prediction is still scored against the recordings. Level 6: `useLiveRouter` hands the whole finished run to `onFinished`, kept in widget state and shown by `router/router-reveal.tsx` above the recorded cards. Level 8: `useLiveTrick` reports each attempt through `onAttempt`; the attempts (each with the model that answered it) live in widget state, so they show in Reveal and survive leaving Play.
- Bug fixed on the way: `useRace` and `useLiveRouter` called the `onFinished` from the render that started the run, so a live result could carry the model alias instead of the answering model id. Both now call the latest callback (a ref set in an effect). Scoreboard row keys include the mode, since a live and a recorded Jev share a model id.
- The Developer mode banner now says Reveal shows the last live run beside the recordings.
- Tests: `raceResults` (3), latest-callback tests for `useRace` and `useLiveRouter`, `RouterReveal` (2), `RevealStep` live rows (2), per-attempt model labels, Jev + Code left off the Leaderboard; e2e `developer-mode.spec.ts` checks Reveal after the level 1 race, the level 6 run and the level 8 tricks, with no extra calls.
- Gates: lint, typecheck, test (114 node:test plus 619 Vitest), build, e2e developer-mode, levels-5-8, level-1 and games 29/29 against `pnpm start`.

## Step-14 - OpenAI and Google prices (2026-10-04) - done

- Skills: test-driven-development (tests first, by hand), local-review. No subagents, no Anthropic spend.
- User decisions: price every text model on both official pages (not a curated list); a promotional price carries its last day and counts as "price unknown" after it, so the app never shows an old number. The owner first asked to drop prices, then kept them because cost is part of every Jev vs LLM comparison.
- Sources: OpenAI `https://developers.openai.com/api/docs/pricing` (the old platform.openai.com URL redirects there), Standard tier, short context; numbers were read from the page's own embedded data, not a summary. Google `https://ai.google.dev/gemini-api/docs/pricing`, Paid tier, text input, prompts up to 200k tokens; its output price includes thinking tokens, which `google.ts` already counts as output. Anthropic and Jev were rechecked the same day and are unchanged, so `checkedOn` is 2026-10-04 for the whole table. Image, video, embedding, music, Live and Realtime models are left out: the app can't call them.
- Built: `priceTableEntrySchema` adds `provider` to each table entry; `validUntil` (optional, UTC date) on `priceEntrySchema`. `priceFor(table, ids, on = new Date())` skips an expired entry and falls through to the next id. Recordings still save only the price numbers and source (the recording schema drops `provider`). Methodology groups the table by provider with each group's source page, marks promotional rows, and says why only the short-context price is stored (every prompt here is under 64k tokens) and that cached-input discounts are not applied (cost can read slightly high, never low).
- Matching is by exact model ID: an OpenAI dated snapshot the user picks directly (for example `gpt-4o-2024-08-06`) shows "price unknown"; a snapshot that answers for an alias the user picked is priced by the alias.
- Tests: `cost.test.ts` (expiry on the last day, the next day, no end date), `prices.test.ts` (OpenAI and Google entries, each source equals its provider's page, promo end dates), `priceGroups`, `llmRacer` pricing an OpenAI answer from the shipped table; e2e `shell.spec.ts` checks the four provider groups and a promotional row on Methodology.
- Claude-in-Chrome was not connected this session, so the Cost section was checked by Playwright element screenshots instead (desktop and phone, theme key set, both themes). That caught `break-all` splitting "until" mid-word on phones; now only the model ID breaks.
- Gates: lint, typecheck, format:check, check:env, check:secrets, check:standards 24/24, check:rls, test (114 node:test plus 626 Vitest), build, e2e shell, developer-mode, level-1, arena, arena-batch, sandbox and games 44/44 against `pnpm start`.

## Step-15 - real-key check, part 1: TypeSafe and Anthropic (2026-10-05) - done

- Skills: test-driven-development (tests first, by hand), local-review. No subagents. Anthropic spend about $0.011 (one level 1 race on Claude Haiku 4.5, owner-approved); Jev cost $0.00074.
- Free probes first, from Node with the owner keys in `.env.local` (only shapes printed): TypeSafe `/v1/models` 200 (`jev-latest`, `jev-preview`); Anthropic `/v1/models` 200 with 12 models and `has_more: false`; Anthropic's CORS preflight from `http://localhost:3000` allows the three headers we send.
- Live check through Claude-in-Chrome against `pnpm start`: the owner pasted both keys into the Keys panel (never typed by the agent, so they stay out of the logs); both Test buttons passed. Level 1 race, Jev vs Claude Haiku 4.5: 80 calls (40 `/api/jev`, 40 Anthropic), all 200, no retries, 0 unparsed; Jev 39/40 in 4.3 s for $0.00074, Haiku 40/40 in 8.3 s for $0.0108, close to the 2026-10-01 recordings. Labels carry the answering model ids (`jev-1.13.0`, `claude-haiku-4-5-20251001`). Reveal showed both live rows above the recordings. No console errors. The server log has 41 `jev pass-through` lines with method, status and duration only; no key or body.
- No response shape needed a fix. Hardening found on the way:
  - Client timeout (owner-approved): `timedFetch` aborts after `PROVIDER_TIMEOUT_MS` (60 s; the slowest recorded call took 8.7 s) and throws a new `timeout` error kind, which is in `RUN_STOPPING_ERRORS` and has its own friendly copy. The caller's own abort is still rethrown as is. `/api/jev` gives its upstream fetch the same timeout and answers 504, which maps to `timeout`.
  - The Anthropic model list asks for `?limit=1000`: the API returns 20 a page by default, so a key with more than 20 models would have lost some. The e2e fakes now match the model list by path.
- Not checked live: the level 8 trick. After the server restart the tab was in Beginner mode, and the auto-mode classifier denied the agent switching it to Developer mode. Step-16 or the owner can run one trick (one Jev call).
- Observation, not changed: the Play step's Anthropic model picker defaults to the first model alphabetically (Claude Fable 5), not the cheapest. Worth an owner decision.
- Tests: `provider-error.test.ts` (timeout, own abort, in-time answer, 504 mapping, run stops), `/api/jev` 504 on a hung upstream, the `limit=1000` URL in `live-providers.test.ts` and `keys.test.tsx`.
- Gates: lint, typecheck, format:check, test (114 node:test plus 632 Vitest), build, e2e developer-mode and arena 12/12 against `pnpm start`.

## Step-16 - real-key check, part 2: OpenAI, Google, OpenRouter (2026-10-05) - skipped for lack of keys

- No key for any of the three: `.env.local` holds only TypeSafe and Anthropic (the recording keys), and only those two were pasted into the localhost tab. Per the step ("only for the providers the owner has keys for"), OpenAI, Google and OpenRouter LLM calls were not run live. Nothing was spent.
- Not checked live, so the faked-test shapes are still unproven against the real APIs: OpenAI chat and model list, Google generateContent and model list (`x-goog-api-key` header), OpenRouter chat completions.
- Free check done: OpenRouter's public `GET /api/v1/models` (no key) returned 200 with `access-control-allow-origin: *`, and all 466 models pass `openRouterSchema` in `src/runner/providers/model-list.ts`. 7 routers carry a negative price, which `perMillion` already maps to no price.
- Claude-in-Chrome limit found: this session's tools opened their own empty tab group and could not see the owner's keyed localhost tab, Supabase, Sentry or PostHog tabs. Nothing was navigated, reloaded or closed.
- No code or content changed. To finish this step later, the owner needs a key for each provider (or a cheap test key) and the Keys panel in a tab the agent can drive.

## Step-17 - Jev through an OpenRouter key (2026-10-05) - blocked, skipped by owner decision (superseded: finished later the same day, see the Step-17 "done" entry at the end of this file)

- Blocked: ROADMAP asks for one real request and a provider built from the real response shape, and there is no OpenRouter key (`.env.local` has only the TypeSafe and Anthropic keys). Building from spec 2.1 alone would be a guess (spec 3.4 says the shape could not be verified).
- Free facts checked: `POST https://openrouter.ai/api/v1/systemone` exists (a keyless call returns 401 `No cookie auth credentials found`), and OpenRouter's public model list has `typesafe/jev-router` (spec 2.1 says `typesafe/jev-1.13`; the real id must come from the first real call).
- Owner chose to continue with Step-18 and do Step-17 later. To finish it: the owner adds `OPENROUTER_API_KEY` to `.env.local` (never in chat, because chats are logged), then one real request from Node shows the shape, then provider, tests and the Keys panel option as for the other providers.

## Step-18 - Sandbox form gaps (2026-10-05) - done

- Skills: test-driven-development (tests first, by hand), local-review gates run by hand. No subagents, no Anthropic spend.
- The Form now has a "When is the answer true / false? (optional)" field pair on a Noul and a "What does <option> mean? (optional)" field per Choice option. They edit the same `SandboxDoc` as the JSON view (R48). A blank Noul field removes its key, and no criteria at all removes `criteria`; a blank option description is `null`. Typed JSON that starts with { or [ is stored as structured data, like the state field.
- Helpers in `src/features/sandbox/doc.ts`: `criterionText`, `withCriterion`, `optionDescriptionText`, `withOptionDescription`. Tests: `doc.test.ts` (4 new), new `form-editor.test.tsx` (4), and an e2e test in `e2e/sandbox.spec.ts` (Form to JSON and back). Score levels already were their own descriptions, so they needed nothing.
- Gates: lint, typecheck, format:check, check:secrets, 640 Vitest plus node:test, Sandbox e2e 8/8 including the four theme and width screenshots (no horizontal scroll).
- Real-API check added after the keys went into the owner's tab: a real Jev call (`jev-1.13.0`, about $0.00002) accepted a Noul with both criteria, a Noul with only `false`, and a Choice with mixed descriptions and `null`, and the answers kept their usual shape. The keyed tab itself still runs the 09:08 build (before Steps 16-19), so a click-through of the new Form fields in it waits for a rebuild.
- NOT run: a production `pnpm build`. The owner's `pnpm start` server on port 3000 serves the keyed tab and a build replaces `.next` under it. Instead the e2e ran against `next dev -p 3100` (Next 16 keeps dev output in `.next/dev`, so it coexists with a running `next start`), then that dev server was stopped. Run the build when the owner is back, or in a step that may restart the server.

## Step-19 - rate limits in Postgres (2026-10-05) - done

- Skills: test-driven-development (tests first, by hand), local-review gates by hand. No subagents, no Anthropic spend.- New table `rate_limit_counters` (`prisma/schema/rate-limit.prisma`, migrations `rate_limit` and `rate_limit_rls`, applied to the dev database; `check:rls` passes on 10 tables). One row per bucket, key hash and fixed window; `checkRateLimit` in `src/server/lib/rate-limit.ts` does one atomic Prisma upsert and returns allowed or the seconds to wait. Keys are SHA-256 hashes, so no raw email or IP is stored. Rows older than 24 h are deleted when a key starts a new window. A database error lets the request through and logs a warning.
- Limits (`RATE_LIMITS`, `src/lib/constants.ts`): `/api/jev` 600 a minute per user and 1,200 per IP (answers 429 with `Retry-After`, before any TypeSafe call; the client shows its existing rate-limit alert); sign-in 10 per 15 min per email and 30 per IP; sign-up 20 an hour per IP. A rate-limited sign-in or sign-up shows its message and a toast.
- Surprise found by e2e: the dev and local production servers add `x-forwarded-for: ::1`, so localhost does have an "IP". `clientIp` now treats loopback (`127.0.0.1`, `::1`, `::ffff:127.0.0.1`) as no address, so local runs and the e2e suite are never IP-limited; the per-email limit still is (an e2e test proves the 11th attempt is stopped).
- Checked against the real database with a temporary test (deleted): sequential hits block at the limit, and 10 parallel hits let exactly 4 through at a limit of 4.
- Tests: `rate-limit.test.ts`, `client-ip.test.ts`, new cases in the `/api/jev` route test, `auth.test.ts` and `use-auth-form.test.ts`; e2e `shell.spec.ts` (limit plus toast). Gates: lint, typecheck, format:check, check:secrets, check:env, check:standards (24), 662 Vitest plus node:test, shell and developer-mode e2e 20/20 against `next dev -p 3100`. No production build (see Step-18: the owner's `pnpm start` serves the keyed tab).
- For Step-21's Privacy page: counters hold hashed user ids, emails and IPs for at most a day.
- Left alone: `error-copy.ts` now says "Too many requests were sent to <provider>" because the same 429 can come from our limit or the provider's.

## Step-20 - security review (2026-10-05) - done

- The `security-review` skill could not run (it diffs against `origin/HEAD`, which is not set, and reviews a branch diff, not the whole app), so the four ROADMAP items were reviewed by hand.
- Auth and ownership: all 6 Server Action files call `requireUser()` (sign-in and sign-up are public by design); every `userId` comes from the session, never from input; every page passes `session.userId` to the data functions; the one route, `/api/jev`, needs a session. The shared result page reads by an unguessable id on purpose (R87). No change needed.
- Dependencies: `pnpm audit --prod` had 3 critical (all Next.js 16.3.0: RCE in the Image optimizer, `next/og` and a Windows case), 10 high, 3 moderate, 1 low. Updated within range: `next` 16.3.8, `posthog-js` 1.435.8, `@sentry/nextjs` 10.76.0. Critical is now 0. The remaining 13 (9 high, 3 moderate, 1 low) are build or CLI tooling that never runs in the app: Prisma's CLI (`mysql2`, `deepmerge-ts`, `fast-uri`), Sentry's build plugins (`fast-uri`, `brace-expansion`) and a low `dompurify` inside posthog-js (needs an `IN_PLACE` option posthog does not use). No `pnpm.overrides` were added: forcing newer majors into those tools risks breaking the build for no runtime gain. Recheck when Prisma 8 and Sentry 11 settle (Prisma 8 is still a release candidate; Sentry 11 is out, a major bump left for later).
- Headers (`src/lib/csp.ts`, `next.config.ts`): the CSP keeps its `connect-src` allowlist and now adds `frame-ancestors 'none'`, `base-uri 'self'`, `form-action 'self'` and `object-src 'none'` (none needs a nonce); every response also gets HSTS (2 years), `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin` and a `Permissions-Policy` turning off camera, microphone and geolocation. Script and style sources stay unrestricted on purpose (Next inlines scripts; a nonce CSP would make every page dynamic). Checked on a real response with curl, and the suites below pass with the stricter policy.
- Key-leak recheck (Rule-8): keys are only in the Keys React context; the only browser-storage use is an analytics dedupe marker and a chunk-reload timestamp; Google keys go in a header; key inputs are `type="password"` with `ph-no-capture`; PostHog replay masks all inputs; the Sentry scrub and the logger redaction (with their tests) are unchanged; the rate-limit table stores only hashes. No change needed.
- Real-key check done on the way, in the owner's keyed tab (old 09:08 build, Developer mode): the level 8 live trick sent a real message to Jev, which answered "Jev saw through it", labelled "Developer mode - run 10:21 - jev-1.13.0", with no console errors. That closes the gap Step-15 left.
- Tooling: `NEXT_DIST_DIR` (default `.next`) lets a build go to its own folder, so a verification build does not replace the one a running `pnpm start` serves; `.next-*` is ignored by git and ESLint, and CLAUDE.md "Known pitfalls" says how to use it.
- Gates: lint, typecheck, format:check, check:secrets, check:standards, Vitest plus node:test, a production build of Next 16.3.8, and the full e2e suite 74/74 on that build (then 32/32 of shell, sandbox, arena and developer-mode again after the headers change). The owner's `pnpm start` on port 3000 was not rebuilt, so the keyed tab still runs the old build; it should be restarted from a fresh build when the keyed tab is no longer needed.

## Step-21 - account deletion and Privacy page (2026-10-05) - done

- Skills: test-driven-development (tests first, by hand). No subagents, no Anthropic spend.
- `deleteAccount` (`src/server/actions/account.ts`): takes no input and uses the session's id, deletes the `User` row (every user table cascades from it: progress, check answers, quiz attempts, XP, badges, leaderboard entries, shares), then the Supabase Auth user with `createSecretKeyClient().auth.admin.deleteUser`, signs out and redirects to sign-in. Rows go first, so a failed auth step can be retried with nothing left behind; an auth user that is already gone (404) still ends in the redirect. Profile has "Delete your account" with a confirm dialog (Cancel and Esc keep the account) and a toast on failure (`delete-account.tsx`, `use-delete-account.ts`).
- `/privacy` (in the app shell, so behind sign-in like every page except a shared result): what we store, never store, who else sees what, and how to delete. Linked from the footer and the sidebar. Spec 13 gained the hashed rate-limit counters; DESIGN screens and actions list both new things.
- **`SUPABASE_SECRET_KEY` is now required** for Delete my account. It was empty; with the owner's approval it was copied from the Supabase dashboard's `default` secret key into `.env.local` through the clipboard, never printed or typed into the chat. `docs/api-setup-guide.md` step 1.11 now says how to get it. Step-29 must add it to Vercel as a normal (not public) environment variable.
- Verified for real: the e2e creates a user, cancels once, deletes, lands on sign-in, and the same credentials are then rejected ("do not match an account"), so the Supabase user and the rows are gone. A temporary real-database probe was started but not needed after that.
- Analytics are anonymous (nothing calls `identify`), so deleting an account leaves no PostHog person to remove; the Privacy page says the anonymous events stay.
- Tests: `account.test.ts` (6), `use-delete-account.test.ts` (3), `delete-account.test.tsx` (4), nav test; e2e `account.spec.ts` (2, with Privacy screenshots in both themes at both widths; the dark ones still render light until Step-23). Gates: lint, typecheck, format, secrets, standards, Vitest plus node:test, production build (separate dir), and 23 e2e (account, progress, shell) on that build.

## Step-22 - GitHub CI (2026-10-05) - done

- The template's `.github/workflows/ci.yml` was re-enabled (`gh workflow enable CI`) and now runs on every push (any branch), on pull requests and by hand. It keeps `check` (lint, typecheck, format:check, check:env, check:secrets, check:standards, test), `build`, `migrations` (a throwaway Postgres 16: replay migrations, run-once SQL, drift check, `check:rls`) and the PR-only `commits` job; `check:standards` requires those. The `e2e` job was removed: the Playwright suite signs up real users on Supabase, which CI has no credentials for (and must not). e2e stays a local check.
- Two real failures fixed on the way (found by the first run): `typecheck` is now `next typegen && tsc --noEmit`, because a clean checkout has no generated `PageProps` types; and `databaseSsl(url)`, `isLoopbackDatabase` and `prisma.config.ts` skip TLS for a database on this machine (CI's throwaway Postgres has none), while every remote host keeps verified TLS. The app's client, `check-rls` and `run-once-sql` pass their URL to the helper.
- Result: run 37271351416 is green (check, migrations, build; commits skipped off PRs). The migrations job also proves every migration so far replays on plain Postgres. The Sentry plugin and Supabase env vars are not set in CI and the build still passes.
- Docs updated to match: CLAUDE.md, AGENTS.md, both skills, `docs/rules/deployment.md`, `migrations.md`, TECH-STACK.md.

## Step-23 - stable e2e auth and real dark screenshots (2026-10-05) - done

- The rate-limit cause was the specs signing in once per test (about 36 sign-ins and 15 sign-ups a run against Supabase's roughly 30 per 5 minutes per IP), plus 10 deliberate failed sign-ins from the Step-19 lockout test. Instead of a Playwright setup project, which would have forced every spec onto one shared user and broken their fresh-state assumptions, `e2e/helpers.ts` keeps each email's session cookies after its first `signUp` or `signIn` and `signIn` puts them back in later tests of the same worker. `signIn(page, email, { fresh: true })` forces a real sign-in (used after the sign-out in `shell.spec.ts`, which ends the saved session). A full run went from clustering rate-limit failures to none.
- Dark screenshots were light because next-themes ignores the emulated color scheme. `setColorScheme(page, scheme)` sets the `theme` local storage key through an init script (and still emulates), and `captureScheme(page, scheme, options)` asserts the html class, waits 1.5 s for the rise-in animation, then screenshots. Every scheme-looped screenshot in the specs uses them; a spot check of `home-desktop-dark.png` shows the dark theme. The theme-switch test keeps plain emulation because it reloads and expects its own choice to stick.
- Full suite on the production build: all green (shell 12/12 after fixing that one test; the rest 70/70), no 429 in the log. Gates: lint, typecheck, format, e2e only (no app code changed).
- Note for later: `next.config.ts` prints a Sentry deprecation ("import `withSentryConfig` from `@sentry/nextjs/config`, v11 stops supporting the old path"). Not urgent; fix it when Sentry 11 is adopted.

## Step-24 - fewer database calls per page (2026-10-05) - done

- The header showed "n of 8 levels" by running the whole progress summary (levels, XP sum, badges: 3 queries) on every signed-in page, and Home, Path and Profile then ran the level query again. `src/server/data/progress.ts` now has one request-cached read of the level rows (`getLevelStatuses`); the header uses a new `getProgressCounts` (that read only: 1 query), and `getProgressSummary` builds on the same read. Result: pages that only show the header go from 3 progress queries to 1, and Home, Path and Profile go from 3 + 3 to 3 in total (the shared read is deduped by React `cache()` within a request). The summary's output is unchanged.
- Tests: two new cases in `progress.test.ts` (exactly one query and no XP or badge query for the header counts; same numbers as the summary). Production build (separate dir) plus 28 e2e (progress, level 1, shell) show the header counter still updates after finishing a level. No load test, as the step says; Step-25 measures it.
- Left alone on purpose: the other per-page reads (a level's progress, quizzes, profile data) each serve one page and are already parallel.

## Step-25 - local load test rerun (2026-10-05) - done

- Run on an idle PC (about 2% CPU before) against a fresh production build of the current commit, served from `.next-verify` on port 3100 so the owner's `pnpm start` on 3000 (the keyed tab) stayed untouched; `load:session` and k6 both took `BASE_URL=http://localhost:3100`. k6 v2.3.0 (the version of the earlier runs) came from the official release zip, checked against the release's sha256 file, unpacked in the scratchpad and not installed.
- 400 people: 19,605 pages, 0% failed, median 214 ms, p95 583 ms, p99 765 ms, target met (2026-10-02: 266 ms and 703 ms; the Step-24 header change and the headers work did not slow it). 1,000 people: 20,723 pages, 0% failed, median 6.7 s, p95 10.1 s, p99 12.1 s, target missed (2026-10-02: 6.2 s and 7.4 s). Throughput is flat at about 82 to 86 pages a second at both sizes, which is the ceiling of one Node process on this PC; more people only queue.
- Methodology now shows the new rows and a computed line: "One Node process served up to about 86 pages a second on this PC. That is comfortably up to 400 people at once; beyond that pages queue." (`load-test-section.tsx`, derived from the result files, two tests). Verified in the built page: the 1,000 and 400 rows, the run date 2026-10-05 and that line. `docs/load-test.md` says how to run on another port and without installing k6.
- This is a local number. Vercel runs many instances, so Step-32 measures the real deployment; do not read 1,000-user queueing here as the launch capacity.
- Left behind on purpose: a `load+...@example.com` test user in the dev Supabase (as in earlier runs). `load/.session` was deleted.

## Step-26 - accessibility audit (2026-10-05) - done

- Added `@axe-core/playwright` (dev dependency; ROADMAP names axe, so it is added and recorded in TECH-STACK.md). `e2e/a11y.spec.ts` runs axe with the WCAG 2.0/2.1 A and AA rule sets over 38 pages and states: the sign-in page (both tabs), Home, Path, all 8 levels (and level 1's Predict, Play, Reveal and Check steps), Games and all 8 games, Leaderboard, Arena (plus a preset and batch mode), Sandbox, both quizzes and the Quizzes list, Profile, Glossary, Methodology, Privacy, and Home with the Keys panel open. It runs in light and dark at desktop and phone width (4 tests), after the 1.5 s rise-in, with the theme really applied (Step-23), against the production build.
- First run: one kind of violation, `scrollable-region-focusable` (serious): a box that scrolls sideways or down (the Sandbox code block, the Methodology tables, the level 1 Reveal scoreboard) cannot be reached by keyboard. Fix: a small `ScrollRegion` (`src/components/ui/scroll-region.tsx`: focusable, labelled region, focus ring), used at all 9 scrollable boxes in the app, not only the 3 that failed (a long answer or a narrower window would have tripped the others). Second run: 0 violations in all 4 combinations. Colour contrast is part of axe's rules, so it was checked in both themes.
- Not covered by axe, so not claimed: pages in states a test did not reach (a finished race result, an open share dialog, a Developer mode failure alert), the shared result page `/s/<id>`, focus order and screen reader wording by ear, and reduced-motion behaviour. A manual pass on those is still worth doing before launch.
- Tests: `scroll-region.test.tsx`, plus the audit itself. Gates: lint, typecheck, format, secrets, 686 Vitest plus node:test, production build (separate dir), axe 4/4.

## Step-27 - Lighthouse mobile page-load check (2026-10-05) - done, target not fully met

- Lighthouse (latest, via `pnpm dlx`, nothing added to the project) in its default mobile profile (a slow phone on slow 4G, 4x CPU slowdown), performance category, signed in with a load-test session, against the production build on port 3100. One run per page, simulated metrics. Pages: Home, level 1 (`/levels/speed-race`), a VS game (`/games/twin-finder`), Arena, Sandbox.
- Before -> after, LCP (largest contentful paint): Home 6.9 -> 4.2 s, level 7.3 -> 6.6 s, game 6.6 -> 4.3 s, Arena 4.9 -> 4.4 s, Sandbox 5.8 -> 4.4 s. Performance score: Home 60 -> 80, level 69 -> 68, game 67 -> 76, Arena 73 -> 75, Sandbox 70 -> 75. FCP is about 0.9 s everywhere, TBT 300 to 400 ms, CLS 0 (level 0.023).
- **R79 (under 2 s on a phone) is met on the real page but not in Lighthouse's slow-phone model.** In the same runs the unthrottled trace shows FCP 0.37 to 0.50 s and LCP 0.37 to 0.84 s on this PC. The model's 4.2 to 6.6 s is mostly downloading and running about 650 to 800 KB of JavaScript on a slow 4G link; no single fix gets it under 2 s, only a much smaller initial bundle does.
- The three causes fixed: (1) the page-enter `rise` animation faded text in from opacity 0, which delayed the LCP paint by the animation's length (about 0.6 s observed); it now slides up without fading (`globals.css`). (2) PostHog loaded a 33 KB surveys script on every page; `disable_surveys: true`. (3) The Sentry browser SDK (117 KB gzipped, about 600 ms of main-thread time under throttling) loaded before the page was usable; `src/lib/observability/sentry-client.ts` now loads and starts it when the browser is idle, and errors reported before it is ready wait behind the same promise (`captureClientError` and `onRouterTransitionStart` use `reportToSentry`; 5 tests). The trade-off: an error in the first second or two, before the SDK starts, is not reported. A first try at (3) alone changed nothing, because the animation kept LCP late enough for the idle load to count against it; the two together gave the gain.
- Still open, in order of size: the initial bundle still carries PostHog (97 KB gz; `posthog-js` is imported statically in 6 files, so deferring it means a loader like the Sentry one), Zod (64 KB gz, shared by every page; probably through the Keys panel and provider modules) and Motion and Radix; and the level page's intro text waits for the per-user Suspense (session plus progress query), so it cannot paint with the static shell (render delay about 0.8 s), which needs the Learn step's text moved into the static part of `LevelStepper`. These are the next levers if the number matters before launch; on Vercel the CDN, compression and no localhost round trip also change the picture, so Step-32 should repeat this check on the live URL.
- Gates: lint, typecheck, format, 691 Vitest plus node:test, production build (separate dir), e2e 31/31 (axe on both themes and widths, shell, level 1, sandbox) on the new build.

## Step-28 - production Supabase (2026-10-05) - done except one setting for the owner

- With the owner's approval (region US East, credentials through a gitignored file), a free project `jevs-playground-prod` was created in the existing Resorvoir organization: ref `svtmhehhxxnnzwwsapcw`, East US (North Virginia, `us-east-1`), Data API off, automatic RLS off, Nano compute. Its connection pool is 15 connections per user and database, with 200 client connections (matters for Step-30).
- Applied from this machine with the production values for those commands only: `prisma migrate deploy` (all 13 migrations), `db:run-once` (nothing to run), `check:rls` ("RLS enabled with no policies on all 10 table(s)"). TLS verified against the existing Supabase CA (`prisma/prod-ca-2021.crt`) worked for both the CLI and the app's client code.
- All production values are in `.env.prod-values.local` (gitignored): `PROD_DB_PASSWORD`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`, `DATABASE_URL` (transaction pooler, 6543) and `DIRECT_URL` (session pooler, 5432). They moved from the dashboard to the file through the clipboard and were never typed or printed, except the incident below. Step-29 needs `DATABASE_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` and `SUPABASE_SECRET_KEY` on Vercel (not `DIRECT_URL`, `PROD_DB_PASSWORD` or the recording keys).
- **Incident, handled:** a status command of mine printed the first generated database password into the session output (a PowerShell array-precedence slip had written the file with the password on its own line, and my "list the variable names" command showed it). The session logs hold only prompts and final replies, so it is not in `.claude-logs/`. Because the project was brand new and empty, the password was rotated at once with Supabase's generator (Database > Settings > Reset database password), the file was rewritten correctly and checked without printing, and everything above ran with the new password. Lesson: build file lines with `-f` formatting, and check files by counting lines or matching patterns, never by listing their content.
- **I have done this: Authentication > Sign In / Providers > Confirm email is still ON in production.** The agent's click to turn it off was blocked by the auto-mode classifier as a security-setting change, so it was left alone. The ROADMAP step wants it off (no email sender of our own, and the app expects a session right after sign-up), so the owner must switch it off and press Save changes before the live smoke test in Step-29. `docs/api-setup-guide.md` section 1 > "Production project" lists all the steps.
- Docs: `docs/api-setup-guide.md` has the new section. Nothing in the app changed.

## Step-30 - database pool for serverless (2026-10-05) - done

- Added `@vercel/functions` (owner-approved) and `pg` as a direct dependency (the version `@prisma/adapter-pg` already used, so one copy; `@types/pg` as a dev dependency), because `attachDatabasePool` needs the `pg` Pool, which the adapter otherwise hides.
- `src/server/db/pool-config.ts`: pool size `DATABASE_POOL_MAX` if set to a positive whole number, else 5 on Vercel (which sets `VERCEL`) and 40 locally; idle timeout 5 s on Vercel only, node-pg's default (10 s) elsewhere. `src/server/db/client.ts` builds the `Pool` itself, calls `attachDatabasePool(pool)` only on Vercel and hands the pool to `PrismaPg`. `DATABASE_POOL_MAX` is in `env.ts` and `.env.example`. Tests: `pool-config.test.ts` (5).
- Why the idle timeout is Vercel-only: measured from this PC to the Mumbai dev database, a new connection costs about 0.58 s against 0.077 s for a warm query, so a 5 s idle timeout made every pause between a user's clicks pay it again. On Vercel the function sits next to the database, where a handshake is cheap and giving pooler slots back quickly is what matters.
- No Supabase upgrade: with 5 per instance the free pooler's 200 clients allow about 40 busy instances; the pool size behind the pooler is 15 per user and database on this Nano compute. Revisit only if Step-32 or launch traffic shows pooler errors.
- Gates: lint, typecheck, format, secrets, standards, check:env, 696 Vitest plus node:test, production build, e2e (progress, account, shell, sandbox) 31/31 on a build that reads only `.env.local`.

## Incident - local production builds used the production database (2026-10-05)

- **What happened:** after Step-28 the production values sat in `.env.production.local`, a name Next.js loads automatically for `next build` and `next start`. Every local production build and server from then on (the Step-30 verification) therefore ran against the production Supabase project: about 3x the query latency (226 ms for `SELECT 1` against 77 ms to Mumbai, a US East database from Pakistan) and a slow, then failing, e2e test, and 32 e2e and load-test accounts created in production.
- **How it was found:** a progress e2e that passed on the dev server and failed on every production build; the browser trace showed 1 to 4 s server actions; Prisma query logging showed about 245 ms per query against 100 ms in dev; a raw `pg` query inside the production runtime showed the same 3x, ruling out bundling and Prisma; and then the file name explained it. Along the way two things were tried and reverted: the idle timeout (kept, Vercel only) and `serverExternalPackages` for `pg` (no effect).
- **Fixed:** the file is now `.env.prod-values.local` (nothing loads it; source it into the shell for one command). Production was cleaned: all 32 test Auth users, their rows and the 8 rate-limit counters were deleted (matched by the test email patterns; it held no other user), leaving every table empty. `docs/api-setup-guide.md` and CLAUDE.md "Known pitfalls" say not to use that name.
- **Not affected:** the Step-25 load test and the Step-27 Lighthouse runs (both before the file existed), and every dev-server run. The Sentry and PostHog projects received events from these runs, which they receive from every local run anyway.

## Step-29 - Vercel deploy (2026-10-05) - done

- Done: `vercel.json` pins the function region to `iad1` (next to the `us-east-1` production database); `docs/api-setup-guide.md` section 6 lists the Vercel steps and every environment variable (which are secret, which are public, which must not be added); `docs/rules/deployment.md` says the app is deployed to `ahmar9/jev-playground`. `NEXT_PUBLIC_APP_URL` is read by no code yet (Step-31 will), so it does not block a first deploy.
- Found: the owner created the Vercel project and put the production keys in, but `*.vercel.app` addresses for the project name return 404 and GitHub shows no Vercel deployment or status for the repo, so the project is not connected to the GitHub repo, or has not been deployed. This Chrome is not signed in to Vercel, so the agent cannot see the dashboard.
- 2026-10-05 (later session): the owner deployed it: https://letsplaywithjev.vercel.app (the project name `jev-playground` is not the address). The owner also set `NEXT_PUBLIC_APP_URL` on Vercel and Supabase's Site URL and Redirect URLs. CLAUDE.md "Local now, Vercel later" now says the app is live.
- Checked signed-out through curl and Chrome: `/` and the other pages redirect to `/sign-in` (200, 0.24 s), `POST /api/jev` answers 401, a missing `/s/<id>` page says "not found" and is noindex, and the CSP, HSTS, frame-deny and Referrer-Policy headers are present. `/robots.txt` and `/sitemap.xml` were 404 until Step-31. No console errors on the sign-in page.
- Signed-in smoke test, done 2026-10-05 on the live URL (the owner created the account, because the agent may not create accounts or enter passwords on a live site; the account is the owner's own, so it stays). Passed: sign-in lands on Home; all 8 levels, 8 VS games, Arena (with batch), Sandbox, quizzes, Glossary, Methodology, Privacy, Leaderboard and Profile return 200 with no error text (about 0.8 to 1.3 s from this browser); Level 1 played end to end in Beginner mode (predict, race replay at recorded speed, result, "Saved to your Leaderboard", and the Leaderboard then shows it); the start quiz saved 3 of 8; Sandbox replays a recording; an Arena run works; Needle Hunt plays; a share link is created with the `vercel.app` address and the Sharer badge, and opens signed-out with noindex and its mode label. Not tested live: Developer mode with real keys (the keys never leave a tab; Step-15 checked that locally) and Delete my account.
- Found, not a bug in the code: the first sign-in and sign-up attempts showed "Could not reach the server" because the tab had been opened before the owner's redeploy. Its page held the old build's Server Action id, and Vercel logged `Failed to find Server Action ... This request might be from an older or newer deployment`. A reload fixed it. Any visitor with a tab open during a deploy will see the same, so deploy when few people are online after launch. Whether to add a friendlier message for this case is open (Step-33, with the runbook).
- Decided with the owner: production keeps the current PostHog project (free plan allows one; filter by `$host`). Production gets its own Sentry project `jevs-playground-prod` (steps in `docs/api-setup-guide.md` section 2, step 7). The owner created it, put its DSN into Vercel's `NEXT_PUBLIC_SENTRY_DSN` and redeployed (build 2 m 34 s). Checked: the live JavaScript carries a DSN for a different project id than `.env.local`'s dev DSN, so production reports to `jevs-playground-prod`. PostHog's free plan allows one project, so a separate production project is not possible without deleting the dev one. Recommended: keep the one PostHog project for both (every event carries its `$host`, so filter on `letsplaywithjev.vercel.app`) and make a second free Sentry project for production. Neither Sentry nor PostHog sets an `environment` tag in our code; adding one is a small change for Step-33 (needs the owner's approval to add to ROADMAP).

## Step-17 - Jev through an OpenRouter key (2026-10-05) - done (commit a7eba46; this finishes the "blocked" Step-17 entry above, which is kept as history)

- Real request first (owner's key from `.env.local`, loaded into the process only): `POST https://openrouter.ai/api/v1/systemone` answers 200 in about 0.7 s with TypeSafe's own request and answers shape. Differences: the model we send is `typesafe/jev-1.13` (there is no `jev-latest` there), the answering model is `typesafe/jev-1.13-20260917`, `usage` also carries `cost`, and the body has extra `id` and `provider` fields that the parser ignores. A first attempt with a guessed question shape got a 400, which only shows OpenRouter validates the same schema as TypeSafe.
- Price: OpenRouter's endpoints API (`/api/v1/models/typesafe/jev-1.13/endpoints`) lists $0.042 per million input tokens and $0 output, and the real `usage.cost` (0.00001596 for 380 input tokens) equals tokens times that price. `content/prices.json` gets an entry for the dated model id with that page as its source, so cost stays tokens times the stored price (R92) and is not read from `usage.cost`. When TypeSafe ships a new dated build the id changes and the cost shows "price unknown" until someone adds it, the same as the TypeSafe route.
- Built: `src/runner/providers/openrouter-jev.ts` (reuses `callTypeSafe` with OpenRouter's URL and model id); `src/features/race/jev-access.ts` (`jevAccessFor(keys)` picks TypeSafe through `/api/jev` or OpenRouter direct from the browser, TypeSafe first); `useLiveSetup`, the Sandbox run and the failure alerts use it, so every Developer mode screen (races, level 6, level 8, Arena, Sandbox) works with an OpenRouter key alone. `LiveConfig` gained `jevProvider` so an error names the provider Jev actually ran on. Copy, the Keys panel text for OpenRouter, Methodology (timing differs by route: with OpenRouter the browser measures the call, routing included), Privacy, spec 3.4, DESIGN 5.3 and README are updated. An OpenRouter key never reaches our server (e2e asserts zero POSTs to `/api/jev`).
- Tests: 11 new Vitest (provider, access resolver, price) and 2 new e2e (Sandbox run, and a full 40-item race on one OpenRouter key). Gates: typecheck, lint, format, 707 Vitest, production build, sandbox and developer-mode e2e 18/18 against intercepted providers. One live run of the real racer (call, parse, score, cost) against OpenRouter passed; it cost a fraction of a cent of the owner's OpenRouter credit, no Anthropic spend.
- Open: `OPENROUTER_API_KEY` in `.env.local` is no longer needed by any code or script; the owner can delete it (spec R22).

## Step-31 - SEO and sharing basics (2026-10-05) - done, not yet deployed

- Decided with the owner: keep the sign-in gate (spec 5.1 is unchanged). Every page except `/sign-in` and `/s/<id>` redirects a signed-out visitor, and that includes Discord's link-preview bot and crawlers, so the card on any pasted URL comes from `/sign-in`, which inherits the root layout. The sitemap therefore lists only `/sign-in`; listing gated pages would hand crawlers a redirect.
- Built: `src/lib/site.ts` (site name and description, `normalizeBaseUrl`, `buildSitemap`, `buildRobots`, pure and unit tested); `src/app/robots.ts` and `src/app/sitemap.ts` read `NEXT_PUBLIC_APP_URL`; `src/app/opengraph-image.tsx` draws the card with the light-theme token values (an image cannot read CSS variables); `src/app/layout.tsx` sets `metadataBase`, `openGraph` and `twitter` (`summary_large_image`); the shared page got a description. Per-page titles already existed from earlier slices.
- Found: the proxy matcher skips only paths with a dot, so the extensionless `/opengraph-image` (Next adds `?<hash>`) was redirected to `/sign-in` for a signed-out bot, which would have shown a card with no image. `gateRedirect` now treats `OG_IMAGE_PATH_PREFIX` (in `src/lib/links.ts`) as public.
- `robots.txt` allows crawling on purpose. A `Disallow: /s/` would stop crawlers from reading the noindex on shared results (the meta tag and the `X-Robots-Tag` header, R87), and the bare URL could still be listed.
- Checked on a production build with curl and Playwright: `/robots.txt`, `/sitemap.xml`, the og and twitter tags on `/sign-in`, the image (200, `image/png`, 72 KB, looked at it) and the noindex header on `/s/*`, all signed out. New: 9 Vitest (8 in `src/lib/site.test.ts`, 1 for the gate), 4 Playwright tests in `e2e/seo.spec.ts`.
- Open, owner: redeploy, then paste `https://letsplaywithjev.vercel.app` into a Discord channel (or a Discord DM to yourself) and check the card shows the name, tagline and image. Discord caches a link's card, so test with a URL that was never posted before (add `?x=1`), or wait for the cache to expire.
- Not done on purpose: per-page Open Graph images and descriptions for gated pages (no crawler can reach them), and a `twitter-image` file (the twitter tags reuse the same image).

## Step-32 - runbook and monitoring (2026-10-05) - done

- `docs/runbook.md`: site down and rollback, a paused Supabase project (7 days idle, restorable for 90 days), key rotation per secret, the Anthropic credit (only `pnpm record` spends it; the live site never does), where alerts go, and known behaviours (stale tab after a deploy, no password reset, promotional price end dates).
- Sentry: the production project `jevs-playground-prod` already had the alert "Send a notification for high priority issues" (email), created by Sentry itself. The owner chose to keep it as the only alert, so none was added.
- PostHog: one funnel insight, "Beginner activation (production)" (https://us.posthog.com/project/638899/insights/zJgOiImf): app_opened, level_started, prediction_made, level_completed, 14-day window, filtered to `$host` = `letsplaywithjev.vercel.app` so local runs do not count. It shows no data until production has traffic. Built through the insight URL's query, because no PostHog MCP is connected (the posthog-funnel-builder skill needs one); all four events were confirmed as fired in the code.

## Step-33 - richer scenes for the 4 P0 VS games (2026-10-05) - done

- Each P0 game has its own scene in `src/features/games/scenes/`, drawn only from the race's state (one step per finished call, no scoring or timing of its own, R92): Guardrail Gauntlet `gate-scene` (messages wait at a gate, each racer sends them to Pass, Review or Block, threats let through are ringed red, an unparseable answer gets its own "No valid answer" bin, R44), Needle Hunt `lines-scene` (a document per item with tabs; each racer's picked lines light up with its icon, right and wrong picks marked), Number Crunch `duel-scene` (two fighters, one hit point lost per miss, the latest round with the right answer) and Review Tug-of-War `rope-scene` (a knot that springs toward the racer that is ahead, each racer's latest rating beside the right one). `scene-data.ts` holds the pure helpers (decisions, picked lines, tallies, knot position), unit tested; `game-scene.tsx` now only dispatches, and the 4 P1 games still use the chip scene until Step-34.
- A scene is a labelled `group` with readable text, not `role="img"`, so a screen reader can read it. Motion runs inside the app's `LazyMotion` and `MotionConfig reducedMotion="user"`.
- Verified on a production build in `.next-verify` (port 3100): 16 Playwright runs (4 games x desktop and phone x light and dark) with no horizontal scroll and screenshots in `e2e/screenshots/`, axe on all pages, and the games and shell specs. Gates: lint, typecheck, format, env, secrets, standards, 741 Vitest plus node:test, RLS, build.
- Fixed two older e2e locators that broke when Step-26 added "Result table" and "<game> table" scroll regions: `getByRole('region', { name: 'Result' })` and the Leaderboard game regions now use `exact: true`.
- Constant added: `GATE_DECISIONS` in `src/lib/constants.ts`.

## Step-34 - richer scenes for the 4 P1 VS games (2026-10-05) - done

- Smart Home Dash `runners-scene` (a house of device cells; each racer's runner arrives at the device it routed the latest command to, wrong routes name the device needed), Twin Finder `belts-scene` (two belts carry the shop listings; each racer stamps the pair same or different with Jev's probability, and a strip of stamped tiles), Citation Cop `checkpoint-scene` (a checkpoint with Flagged and Waved through either side, bad citations that got through ringed in red, the latest claim with its source) and Confidence Catch `fall-scene` (answers fall into the team baskets or onto the review desk). The game now holds the confidence threshold (`DEFAULT_CONFIDENCE_THRESHOLD`, 0.9): `ThresholdPanel` is controlled, and dragging its slider re-sorts Jev's answers in the scene as well. The LLM gives no confidence, so every LLM answer is acted on, and the scene says so. `GameScene` dispatches all 8 animations; the chip scene is gone.
- New pure helpers in `scene-data.ts` (option labels, yes or no, Jev's probability, check tally, confidence, acted-on rule), unit tested; component tests for the four scenes.
- Verified like Step-33: games e2e 37/37 on a production build (8 games x desktop and phone x light and dark, no horizontal scroll, screenshots in `e2e/screenshots/`, and the slider moving the scene), lint, typecheck, format, env, secrets, standards, 754 Vitest plus node:test, RLS, build.
