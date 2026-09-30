# Progress

## Step-0 - Agent capture setup (2026-09-30) - done

- Session logging is installed at user level: `~/.claude/extract-log.py` plus `UserPromptSubmit`/`Stop` hooks in `~/.claude/settings.json`. It writes to `.claude-logs/` in the repo. Details, Windows fixes and canary proof are in `CAPTURE-TEST.md`.
- `CLAUDE.md` > Session logs now carries the guide's line "Always commit `.claude-logs/` with your changes."
- `.claude-logs/` also holds 14 older logs that came with the 8x template (Aug-Sep 2026). They are not ours; Step-0.2 decides whether to keep them.
- Context for later steps: `python3` doesn't work on this machine (use `python`). `gh` is installed and logged in as `Ahmar004`, so logs show `github_user: Ahmar004`.
- ROADMAP Step-0 wording was changed from `.agent-logs/` to `.claude-logs/` (user-approved).
- A push to `main` triggers `.github/workflows/ci.yml` and `deploy-migrations.yml`.

Next: Step-0.1 (brainstorming -> spec.md).
