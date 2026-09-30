@AGENTS.md

Everything above applies to any coding agent working in this repo (Claude,
Codex, Cursor, whatever) — it lives in `AGENTS.md`, not here, on purpose,
since `AGENTS.md` is the file every tool reads and `CLAUDE.md` is
Claude-Code-only. Don't duplicate rules back into this file; add them to
`AGENTS.md` so they reach every tool, not just this one.

This file holds the two things that genuinely are Claude-Code-specific.

## ROADMAP.md file at root:

Follow @ROADMAP.md at root at all costs, ask and share before editing anything in it, it contains a well planned roadmap that we must follow, it also contains some rules not to break, and we have to do one step at a time from roadmap for proper focus (unless user asks to do multiple steps simultaneously.)

## Session logs

`.claude-logs/` is tracked, not gitignored — the transcript for the session
that produced a change belongs on the branch that ships it. Stage it
immediately before every `git push`, separately from the code commit.

Always commit `.claude-logs/` with your changes.

Capture is automatic: user-level `UserPromptSubmit` and `Stop` hooks in
`~/.claude/settings.json` run `~/.claude/extract-log.py`, which writes only
prompts and final replies (no tool calls). Setup and proof are in
`CAPTURE-TEST.md`; the guide is `docs/agent-session-logs-setup.md`.

## Skills

See `.claude/skills/*/SKILL.md` for full detail. In short:

- `dev-onboarding`: get a local environment running on this project.
- `local-review`: before every commit and push. GitHub CI is disabled, so this
  is the only gate (`docs/rules/commits.md`).
- `typesafe`: audits the type assertions this branch introduced (the no-`any`
  rule, `docs/rules/code-quality.md`).
- `e2e-review`: before pushing a UI or flow change.
- `dogfood`: exploratory QA of the running app (Step-7).
- `local-feature-testing`, `sql-preview`, `seed-for-pr` (test fixtures only,
  never product data, ROADMAP Rule-5).
- `create-issue`: file work as a GitHub issue instead of doing it now.
- `posthog-funnel-builder`: build a PostHog funnel from the events the code
  fires.

## Local only

The app runs on localhost (spec R95). Never deploy. Prisma migrations are
generated and applied locally against our database (`pnpm exec prisma migrate
deploy`, then `node scripts/generate-migration.mjs --name <name> --db-url
<url>`), as 8x confirmed.
