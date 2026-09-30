# Agent Session Capture - Test Record

Roadmap Step-0. Proves that Claude Code session logging (guide:
`docs/agent-session-logs-setup.md`) is installed and captures every prompt and
final response to `.claude-logs/`, and nothing else.

## Setup

| Item          | Value                                                                                                                                                                                            |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Machine       | Windows 11 Pro, Claude Code CLI, Python 3.13                                                                                                                                                     |
| Script        | `~/.claude/extract-log.py` (the guide's script with the Windows fixes below)                                                                                                                     |
| Hooks         | `UserPromptSubmit` and `Stop` in `~/.claude/settings.json`, both running `python "C:/Users/Ahmar Ali/.claude/extract-log.py"` (existing settings kept; a backup is in `settings.json.bak-step0`) |
| Output        | `<repo>/.claude-logs/<timestamp>_<session-id>.md`, committed (not gitignored)                                                                                                                    |
| Commit policy | `CLAUDE.md` > Session logs: "Always commit `.claude-logs/` with your changes."                                                                                                                   |

## Changes from the guide's script, and why

1. **`python`, not `python3`.** On this machine `python3` is the Microsoft Store placeholder and does not run Python.
2. **Project folder naming.** Claude Code turns every non-alphanumeric character into `-` (`D:\0_8x\Playmakers\project` becomes `D--0-8x-Playmakers-project`). The guide only replaces `/`, so it could not find the folder on Windows.
3. **UTF-8 read and write.** Windows defaults to cp1252, which breaks on non-ASCII text in a prompt.
4. **Uses the hook's `session_id` and `transcript_path`.** The guide takes the newest transcript. The canaries showed that this puts a new session's first prompt into another session's log, because the new session's transcript does not exist yet at that point.
5. **Prompt taken from the hook input on `UserPromptSubmit`.** Claude Code writes the prompt to the transcript only after this hook returns. Waiting for it added about 10 seconds to every prompt.
6. **Short re-read on `Stop` (up to 5 seconds).** `Stop` can fire a few hundred milliseconds before the final reply reaches the transcript, which left the log without its response (canary B).

Output format, file naming and the prompt-and-reply-only filtering are unchanged from the guide.

## Canary runs

Session A is this interactive setup session. Sessions B to C are separate headless sessions (`claude -p --model haiku`) started in the repo root, so the hooks ran on their own.

| Session                                                                | Log file (`.claude-logs/`)           | Result                                                                                                                   |
| ---------------------------------------------------------------------- | ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------ |
| A - setup session, first prompt "deliver step-0 under @ROADMAP.md ..." | `2026-09-30_20-49-03_fff54380-...md` | Initial prompt captured (requested by the user)                                                                          |
| B - `CANARY-B`                                                         | `2026-09-30_20-49-36_fc10a8c1-...md` | Prompt captured, reply missing (the Stop race, fix 6). Regenerated from its transcript after the fix                     |
| B2 - `CANARY-B2`                                                       | `2026-09-30_20-50-24_aa2b770b-...md` | Prompt and reply captured, but the prompt hook added ~10 s (fix 5)                                                       |
| B3 - `CANARY-B3`                                                       | `2026-09-30_20-50-58_c4aede5d-...md` | Prompt and reply captured. Its first prompt also leaked into session A's log (fix 4); A's log was regenerated clean      |
| C - `CANARY-C`                                                         | `2026-09-30_20-51-28_2dcc1d83-...md` | Pass: log created at prompt time, reply added at stop, `session_status: complete`, 4 s total, no leak into any other log |

## How to re-check

1. Start a new Claude Code session in the repo and send any prompt.
2. A new `.claude-logs/<today>_<session-id>.md` appears right away with a `[CLAUDE_LOG_ENTRY type=PROMPT ...]` block. After the reply it also has a `type=RESPONSE` block and `session_status: complete`.
3. The file contains no tool calls, tool output or file contents.

## GitHub attribution

`github_user` first showed `unknown` because the GitHub CLI (`gh`) wasn't installed. `gh` 2.102.0 was then installed (winget) and logged in as `Ahmar004`, and every log from 2026-09-30 was rebuilt from its transcript; all now show `github_user: Ahmar004`. If a session started before `gh` was installed, its PATH doesn't include `gh`, so the script falls back to `C:\Program Files\GitHub CLI\gh.exe`.
