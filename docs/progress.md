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
- Follow-up edits: `AGENTS.md` (rule index, per-tool section), `docs/rules/deployment.md` (localhost only, never deploy) and `docs/rules/migrations.md` (local generation flow) are rewritten. Every kept doc and skill that pointed at a removed file, script, variable or skill is cleaned, except `README.md`, which Step-9 rewrites.
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
