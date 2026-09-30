# To discard - template parts Jev's Playground does not need

Written in Step-0.2 (2026-10-01) after reading the whole 8x web template against `spec.md`. Step-0.4 removes everything below, with the user's permission. Each group lists the files, the reason, and the follow-up edits that keep the repo building and keep `pnpm check:standards` passing.

The user decided these in Step-0.2:
- Recording is a local CLI, checked by playing in Beginner mode on localhost.
- The Supabase project, if Step-1 picks Supabase, is the user's own, not 8x's.
- Sentry and PostHog stay.
- next-intl goes.
- CI runs locally only.
- Claude Code is the only agent.
- Template migrations are reset.
- DESIGN.md merges into Step-3.
- `docs/requirements.md` stays as an archive.

## 1. Admin RBAC (staff console)

Why: the only owner-only feature is recording, and it runs as a local CLI, so there is no staff web surface to protect. Players are ordinary signed-in users with no roles (spec 10).

- `src/lib/rbac/` (whole folder, tests included)
- `src/app/[locale]/admin/`
- `prisma/schema/authz.prisma`, and the `adminMember` relation on `User` in `prisma/schema/example.prisma`
- `docs/rules/authorization.md`

Follow-up edits:
- Remove the `authorize` option and the rbac imports from `src/server/api/route-factory.ts` and `src/server/actions/validated-action.ts`.
- In `src/server/auth/provision-user.ts`, keep the `User` upsert and remove the staff-seat logic.
- Remove the Authorization bullet from `AGENTS.md`.

## 2. DB-backed feature flags

Why: the spec has no staged rollouts or experiments, and the flag system's admin toggle depends on RBAC.

- `src/lib/flags/` (whole folder, tests included)
- `src/server/actions/feature-flags.ts`
- `prisma/schema/flags.prisma`
- `docs/rules/feature-flags.md`
- `POSTHOG_PERSONAL_API_KEY`, which only enables local flag evaluation

Follow-up edits:
- Remove `secretKey` from `src/lib/posthog/server.ts`.
- Remove the key from `.env.example` and `src/lib/env.ts` together (`check:env`).
- Remove the Feature flags bullet from `AGENTS.md`.

## 3. AI usage ledger (MOAD)

Why: the ledger exists for 8x's MOAD spend dashboard, which cannot read the user's own Supabase. Recordings already store tokens, cost and the price used per call (spec 3.3), and the recorder prints each run's total against the $50 budget. Developer mode spend is the user's own, so we never ledger it.

- `src/server/lib/ai-usage/`
- `src/server/ai/anthropic.ts` (a placeholder SDK wrapper; our provider calls will be fetch-based and shared by the browser and the CLI)
- `prisma/schema/ai-usage.prisma`
- `docs/rules/ai-usage.md`
- `scripts/check-ai-models.mjs`, and the `check:ai-models` script in `package.json`
- `.claude/skills/ai-usage-check/`, `.claude/skills/ai-usage-setup/`

Follow-up edits:
- Delete the `ai-models` job from `.github/workflows/ci.yml`.
- Delete the `AI_SDK_IMPORTS` group and the `src/server/ai/**` block from `eslint.config.mjs`.
- Remove the AI usage bullet from `AGENTS.md`, and the AI skill lines from `CLAUDE.md`.

## 4. i18n (next-intl)

Why: the site is English only (R74, R96). next-intl adds a `[locale]` URL segment, a catch-all 404 route and a proxy step for no benefit.

- the `next-intl` dependency
- `src/i18n/`
- `messages/en.json`
- `src/app/[locale]/[...rest]/`, which exists only to route 404s inside `[locale]`
- `NEXT_PUBLIC_DEFAULT_LOCALE`

Follow-up edits:
- Move `src/app/[locale]/*` up to `src/app/`.
- Drop `createNextIntlPlugin` from `next.config.ts`.
- In `src/proxy.ts`, remove the intl step and keep the Supabase session refresh.
- Swap the `@/i18n/routing` Link for `next/link` in `not-found.tsx`.
- Remove the `/en` assertion from `e2e/smoke.spec.ts`.
- Remove the variable from `.env.example` and `src/lib/env.ts` together.

## 5. Slack alerting and cron

Why: there is no team Slack channel (Sentry already reports errors), and the spec has no scheduled jobs.

- `src/lib/notifications/slack.ts`, and `SLACK_ALERT_WEBHOOK_URL`
- `src/server/api/cron-auth.ts` and its test, and `CRON_SECRET`

Follow-up edits:
- Remove the Slack call from `src/lib/observability/capture-error.ts`.
- Remove `createCronRoute` from `src/server/api/route-factory.ts`.
- Remove the `CRON_SECRET` env lines from `ci.yml`.
- Remove both variables from `.env.example` and `src/lib/env.ts` together.

## 6. Demo code

Why: it is example content (Rule-5: no dummy data). `src/components/track-impression.tsx` stays, because the real pages can use it.

- `src/app/[locale]/analytics-demo/`

## 7. Deployment, Vercel and remote CI

Why: the app runs on localhost only (R95). There is no Vercel project, no production database and no staging, and GitHub CI stays disabled. The same gates run locally through `local-review` before every push. Per 8x, migrations are generated and applied locally.

- `.github/workflows/deploy-migrations.yml` (targets a production DB we won't have)
- `.github/workflows/claude-code-review.yml` (needs a GitHub-side Anthropic credential)
- `docs/CI_CD_SETUP.md` (GitHub secrets and Vercel setup)
- `.claude/skills/preview-acceptance-testing/` (Vercel previews)
- `.claude/skills/staging-migration/` (a staging DB)
- `.claude/skills/sentry-digest/` (a weekly production error review; Sentry itself stays)
- `.claude/commands/cicd.md` (opens PRs and watches remote CI)
- the `PRODUCTION_DATABASE_URL` comment in `.env.example`

Follow-up edits:
- `.github/workflows/ci.yml` stays in the repo (disabled on GitHub), because `check:standards` requires it.
- `docs/rules/deployment.md` stays, because `check:standards` requires it. Rewrite it to say "local only, no deploys".
- Update `docs/rules/migrations.md` for local generation: `pnpm exec prisma migrate deploy`, then `node scripts/generate-migration.mjs --name <name> --db-url <url>`, applied locally.
- Remove the `CI_CD_SETUP.md` pointer from `AGENTS.md` and the matching lines from `CLAUDE.md`.

## 8. Other coding agents

Why: Claude Code is the only agent on this project. `AGENTS.md` stays, because `CLAUDE.md` imports it and `check:standards` requires it.

- `.codex/`, `.codex-logs/`, `GEMINI.md`, `QWEN.md`, `.cursor/`
- `.claude/skills/e2e-build/` (it needs Codex)

Follow-up edits:
- Remove the `.codex-logs/` line from `.prettierignore`.
- Update the per-tool entry points list in `AGENTS.md`.
- Drop the Codex mentions from `docs/rules/secrets.md` and the `.codex/` mirror note in `CLAUDE.md`.

## 9. One-time template tooling

- `.claude/skills/template-setup/`: its useful steps (renaming the `8x-web-template` placeholders) happen by hand in Step-5, and Step-9 writes the README.
- `.claude/skills/skill-creator/`: it duplicates the globally installed `anthropic-skills:skill-creator`, and it ships committed `__pycache__/*.pyc` files.

## 10. Template migrations

Why: the 7 folders under `prisma/schema/migrations/` create `admin_members`, `feature_flags` and `ai_usage`, and no database has ever applied them. Deleting them now keeps the history clean without a hand-written DROP migration. Step-5 generates one fresh baseline locally, plus the sanctioned enable-RLS migration.

- every `prisma/schema/migrations/2026*/` folder. `prisma/schema/migrations/README.md`, `prisma/run-once.sql` and `scripts/run-once-sql.mjs` stay.

## Not discarded, but replaced in a later step

| Item | Replaced in | By |
|---|---|---|
| `DESIGN.md` (token conventions) | Step-3 | The Step-3 design doc. Windows treats `design.md` and `DESIGN.md` as one file, so it keeps the name `DESIGN.md` and absorbs the template's token rules. |
| `README.md` (template voice) | Step-9 | The submission README. |
| `package.json` name, layout `metadata.title`, `.env.example` header | Step-5 | Jev's Playground names. |
| `src/app/[locale]/page.tsx` placeholder home, `e2e/smoke.spec.ts` | Step-6 | Real Home page and real specs. |
| Starter color values in `src/app/globals.css` | Step-3 | The spec 11 themes. The token structure stays. |
| `docs/requirements.md` | Kept | Archive of the verbatim brief. `spec.md` is the working source. |

## Pending Step-1

Prisma 6, Supabase Auth, and everything built on them (`src/lib/supabase/`, `src/proxy.ts`, `src/server/db/`, `scripts/check-rls.mjs`, `docs/rules/database.md`, `docs/rules/auth.md`, `docs/rules/migrations.md`) stay for now as the template default. If Step-1 picks a different database or auth, the parts it replaces get added here then.
