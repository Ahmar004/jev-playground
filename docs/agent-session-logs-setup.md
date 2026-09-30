# Agent Session Logs — Setup Guide

Hand this file to your coding agent (Claude Code, Codex, Cursor, etc.) and ask it to set up session logging in the current repo. The end result: every prompt + final response from the session is captured to `.claude-logs/` in the directory where the session started, and committed alongside the work — but **none of the intermediate tool calls, file reads, or work artefacts** are recorded.

---

## What this does

- On every prompt submit and at the end of every turn, a hook runs a small Python script.
- The script reads the **agent's own session transcript** (the JSONL file the agent already writes for itself) and produces a clean markdown digest with frontmatter stats.
- Output is written to `<session-cwd>/.claude-logs/<timestamp>_<session-id>.md` — so each repo's sessions land in that repo's own log directory.
- **`.claude-logs/` is the canonical directory regardless of which agent you're using** (Claude Code, Codex, Cursor, Aider, etc.). One repo, one log location, one commit policy. Don't pick a per-agent name like `.codex-logs/` — collapse everything into `.claude-logs/` so reviewers and tooling have one place to look.
- Only **user prompts** and **final assistant text** are kept. Tool calls, tool results, file diffs, thinking blocks, and sidechain agent output are stripped.
- Each run **overwrites** the same session file (idempotent), so there's only ever one log per session.
- Each log records **who submitted it**: git author name, git email, and the authenticated GitHub login (via `gh api user`). This survives in the committed file's frontmatter, so the log itself answers "whose session was this" without needing to inspect the commit.

The intent is "what did I ask, what did the agent say back" — a conversation transcript, not an audit log of operations.

---

## Agent instructions (read this carefully)

You are being asked to install session logging. Do the following **without modifying any other settings**:

1. **Confirm the platform.** This guide is written for Claude Code's hook system + JSONL session format (`~/.claude/projects/<dashed-cwd>/*.jsonl`). If the user is running a different agent (Codex, Cursor, Aider, etc.), see the "Other agents" section at the bottom — adapt the script to read that agent's transcript format, but keep the output format and `.claude-logs/` location identical.

2. **Write `~/.claude/extract-log.py`** with the exact contents from the "extract-log.py" section below. Make it executable: `chmod +x ~/.claude/extract-log.py`.

3. **Merge the hooks** in the "settings.json hooks" section into `~/.claude/settings.json`. Do not overwrite the file — read it, merge the `hooks.UserPromptSubmit` and `hooks.Stop` entries (preserving anything already there), and write it back.

4. **Add `.claude-logs/` to the repo's commit policy, not its `.gitignore`.** These logs are meant to be committed. If the user has a project `CLAUDE.md`, add the line: `Always commit \`.claude-logs/\` with your changes.`

5. **Verify.** Trigger the hook once (any prompt will do), then check that `.claude-logs/<today>_<session>.md` exists in the current working directory and contains a `[CLAUDE_LOG_ENTRY type=PROMPT ...]` block followed by the prompt text.

6. **Do not log anything else.** Do not add hooks that capture tool calls, bash output, or file diffs. The whole point is that the work product stays out of the log.

---

## extract-log.py

Save to `~/.claude/extract-log.py`:

```python
#!/usr/bin/env python3
"""Extract clean conversation logs from Claude Code sessions."""

import json
import os
import re
import subprocess
from pathlib import Path
from datetime import datetime
from typing import List, Optional, Tuple, Dict, Any


def get_git_author() -> str:
    """Get the author for attribution. Checks CLAUDE_AUTHOR env var first, then git config."""
    if author := os.environ.get('CLAUDE_AUTHOR'):
        return author
    try:
        result = subprocess.run(
            ['git', 'config', 'user.name'],
            capture_output=True,
            text=True,
            timeout=5
        )
        if result.returncode == 0 and result.stdout.strip():
            return result.stdout.strip()
    except (subprocess.TimeoutExpired, FileNotFoundError):
        pass
    return 'unknown'


def get_github_user() -> str:
    """Get the authenticated GitHub login via `gh`. Returns 'unknown' if unavailable."""
    if login := os.environ.get('GITHUB_USER'):
        return login
    try:
        result = subprocess.run(
            ['gh', 'api', 'user', '--jq', '.login'],
            capture_output=True,
            text=True,
            timeout=5
        )
        if result.returncode == 0 and result.stdout.strip():
            return result.stdout.strip()
    except (subprocess.TimeoutExpired, FileNotFoundError):
        pass
    return 'unknown'


def get_git_email() -> str:
    """Get the git config user.email for attribution."""
    try:
        result = subprocess.run(
            ['git', 'config', 'user.email'],
            capture_output=True,
            text=True,
            timeout=5
        )
        if result.returncode == 0 and result.stdout.strip():
            return result.stdout.strip()
    except (subprocess.TimeoutExpired, FileNotFoundError):
        pass
    return 'unknown'


def get_project_session_dir(cwd: Path) -> Path:
    """Get the session directory for a project."""
    claude_dir = Path.home() / '.claude' / 'projects'
    project_hash = str(cwd).replace('/', '-')
    return claude_dir / project_hash


def is_user_prompt(entry: dict) -> bool:
    """Check if entry is a real user prompt (not meta/command/tool result)."""
    if entry.get('type') != 'user':
        return False
    if entry.get('isMeta') or entry.get('isSidechain'):
        return False

    content = entry.get('message', {}).get('content', '')

    if isinstance(content, list):
        if any(c.get('type') == 'tool_result' for c in content):
            return False
        return False

    if isinstance(content, str):
        if content.startswith('<command-name>'):
            return False
        if content.startswith('<local-command'):
            return False
        if content.startswith('Caveat:'):
            return False
        if not content.strip():
            return False
        return True

    return False


def extract_assistant_text(entry: dict) -> Optional[str]:
    """Extract text content from assistant message."""
    if entry.get('type') != 'assistant':
        return None
    if entry.get('isSidechain'):
        return None

    content = entry.get('message', {}).get('content', [])

    if isinstance(content, str):
        return content if content.strip() else None

    if isinstance(content, list):
        texts = []
        for block in content:
            if block.get('type') == 'text':
                text = block.get('text', '').strip()
                if text:
                    texts.append(text)
        return '\n\n'.join(texts) if texts else None

    return None


def extract_clean_log(jsonl_path: Path) -> List[Tuple[str, str, str]]:
    """Extract conversation entries from a JSONL file."""
    entries = []

    for line in jsonl_path.read_text().strip().split('\n'):
        if not line.strip():
            continue
        try:
            entry = json.loads(line)
        except json.JSONDecodeError:
            continue

        timestamp = entry.get('timestamp', '')

        if is_user_prompt(entry):
            content = entry.get('message', {}).get('content', '')
            if isinstance(content, str) and content.strip():
                entries.append((timestamp, 'user', content.strip()))

        elif entry.get('type') == 'assistant':
            text = extract_assistant_text(entry)
            if text:
                entries.append((timestamp, 'assistant', text))

    return entries


def format_timestamp(iso_timestamp: str) -> str:
    try:
        dt = datetime.fromisoformat(iso_timestamp.replace('Z', '+00:00'))
        return dt.strftime('%Y-%m-%d %H:%M')
    except (ValueError, AttributeError):
        return ''


def dedupe_entries(entries: List[Tuple[str, str, str]]) -> List[Tuple[str, str, str]]:
    """Keep only the final assistant response before each user prompt."""
    if not entries:
        return []

    result = []
    pending_assistant = None

    for timestamp, role, content in entries:
        if role == 'user':
            if pending_assistant:
                result.append(pending_assistant)
                pending_assistant = None
            result.append((timestamp, role, content))
        elif role == 'assistant':
            pending_assistant = (timestamp, role, content)

    if pending_assistant:
        result.append(pending_assistant)

    return result


def detect_paste_indicators(content: str) -> Dict[str, bool]:
    """Detect heuristic indicators that content was pasted."""
    indicators = {
        'has_code_block': '```' in content,
        'has_file_paths': bool(re.search(r'[\w\-/]+\.(ts|js|py|tsx|jsx|json|md|txt|yml|yaml):\d+', content)) or
                         bool(re.search(r'(?:^|[\s\(])/[\w\-/]+\.[\w]+', content, re.MULTILINE)),
        'has_urls': bool(re.search(r'https?://', content)),
        'is_long': len(content) > 500,
        'has_stack_trace': bool(re.search(r'at \w+.*:\d+:\d+', content)) or
                          bool(re.search(r'File ".*", line \d+', content)),
        'has_structured_data': bool(re.search(r'^[\s]*[{\[]', content, re.MULTILINE)) and
                              ('{' in content and '}' in content),
    }

    indicator_count = sum(indicators.values())
    indicators['likely_pasted'] = indicator_count >= 2 or indicators['is_long']

    return indicators


def parse_iso_timestamp(timestamp: str) -> Optional[datetime]:
    try:
        return datetime.fromisoformat(timestamp.replace('Z', '+00:00'))
    except (ValueError, AttributeError):
        return None


def calculate_session_stats(entries: List[Tuple[str, str, str]]) -> Dict[str, Any]:
    """Calculate comprehensive session statistics."""
    if not entries:
        return {}

    prompts = [(ts, content) for ts, role, content in entries if role == 'user']
    responses = [(ts, content) for ts, role, content in entries if role == 'assistant']

    if not prompts:
        return {}

    stats = {}

    first_prompt_dt = parse_iso_timestamp(prompts[0][0])
    last_prompt_dt = parse_iso_timestamp(prompts[-1][0])

    stats['first_prompt_time'] = prompts[0][0]
    stats['last_prompt_time'] = prompts[-1][0]

    if first_prompt_dt and last_prompt_dt:
        duration = (last_prompt_dt - first_prompt_dt).total_seconds() / 60
        stats['session_duration_minutes'] = round(duration, 1)

        if len(prompts) > 1:
            avg_gap = duration / (len(prompts) - 1)
            stats['avg_time_between_prompts_minutes'] = round(avg_gap, 1)

    prompt_chars = [len(content) for _, content in prompts]
    prompt_words = [len(content.split()) for _, content in prompts]

    stats['total_prompt_chars'] = sum(prompt_chars)
    stats['total_prompt_words'] = sum(prompt_words)
    stats['avg_prompt_length_chars'] = round(sum(prompt_chars) / len(prompts), 1)
    stats['avg_prompt_length_words'] = round(sum(prompt_words) / len(prompts), 1)
    stats['longest_prompt_words'] = max(prompt_words)
    stats['shortest_prompt_words'] = min(prompt_words)

    if responses:
        response_chars = [len(content) for _, content in responses]
        stats['total_response_chars'] = sum(response_chars)
        stats['avg_response_length_chars'] = round(sum(response_chars) / len(responses), 1)

        if stats['total_prompt_chars'] > 0:
            stats['response_to_prompt_ratio'] = round(
                stats['total_response_chars'] / stats['total_prompt_chars'], 2
            )

    paste_data = [detect_paste_indicators(content) for _, content in prompts]
    stats['prompts_with_code_blocks'] = sum(1 for p in paste_data if p['has_code_block'])
    stats['prompts_with_file_paths'] = sum(1 for p in paste_data if p['has_file_paths'])
    stats['prompts_with_urls'] = sum(1 for p in paste_data if p['has_urls'])
    stats['prompts_with_long_content'] = sum(1 for p in paste_data if p['is_long'])
    stats['likely_pasted_count'] = sum(1 for p in paste_data if p['likely_pasted'])

    return stats


def main():
    cwd = Path(os.environ.get('CLAUDE_CWD', os.getcwd()))
    session_dir = get_project_session_dir(cwd)

    if not session_dir.exists():
        return

    session_files = [
        f for f in session_dir.glob('*.jsonl')
        if not f.name.startswith('agent-')
    ]

    if not session_files:
        return

    latest = max(session_files, key=lambda p: p.stat().st_mtime)
    session_id = latest.stem

    entries = extract_clean_log(latest)
    entries = dedupe_entries(entries)

    if not entries:
        return

    session_stats = calculate_session_stats(entries)

    output_dir = cwd / '.claude-logs'
    output_dir.mkdir(parents=True, exist_ok=True)

    existing_files = list(output_dir.glob(f"*_{session_id}.md"))
    date = datetime.now().strftime('%Y-%m-%d')
    if existing_files:
        output_path = existing_files[0]
    else:
        timestamp = datetime.now().strftime('%Y-%m-%d_%H-%M-%S')
        filename = f"{timestamp}_{session_id}.md"
        output_path = output_dir / filename

    last_entry_type = entries[-1][1] if entries else 'unknown'
    session_status = 'complete' if last_entry_type == 'assistant' else 'awaiting_response'

    author = get_git_author()
    github_user = get_github_user()
    git_email = get_git_email()
    lines = ["---"]
    lines.append(f"session_id: {session_id}")
    lines.append(f"date: {date}")
    lines.append(f"author: {author}")
    lines.append(f"github_user: {github_user}")
    lines.append(f"git_email: {git_email}")
    lines.append(f"project: {cwd.name}")
    lines.append(f"session_status: {session_status}")
    lines.append(f"last_entry_type: {last_entry_type}")
    lines.append(f"total_exchanges: {len([e for e in entries if e[1] == 'user'])}")
    lines.append(f"generated_at: {datetime.now().isoformat()}")

    for key, value in session_stats.items():
        lines.append(f"{key}: {value}")

    lines.append("---\n")
    lines.append(f"# Claude Session Log - {date}\n")
    lines.append(f"Session: `{session_id}` | Project: `{cwd.name}` | Author: `{author}` | GitHub: `{github_user}`\n")
    lines.append("---\n")

    prompts_data = []
    for timestamp, role, content in entries:
        if role == 'user':
            paste_indicators = detect_paste_indicators(content)
            prompts_data.append({
                'timestamp': timestamp,
                'content': content,
                'chars': len(content),
                'words': len(content.split()),
                'paste_indicators': paste_indicators,
            })

    exchange_num = 0
    prompt_index = 0

    for i, (timestamp, role, content) in enumerate(entries):
        time_str = format_timestamp(timestamp)

        if role == 'user':
            exchange_num += 1
            prompt_data = prompts_data[prompt_index]
            indicators = prompt_data['paste_indicators']

            lines.append(f"\n[CLAUDE_LOG_ENTRY type=PROMPT num={exchange_num} session={session_id}]")
            lines.append(f"timestamp: {timestamp}")
            lines.append(f"time: {time_str}")
            lines.append(f"chars: {prompt_data['chars']}")
            lines.append(f"words: {prompt_data['words']}")
            lines.append(f"has_code_block: {indicators['has_code_block']}")
            lines.append(f"has_file_paths: {indicators['has_file_paths']}")
            lines.append(f"has_urls: {indicators['has_urls']}")
            lines.append(f"likely_pasted: {indicators['likely_pasted']}")
            lines.append(f"\n{content}\n")

            prompt_index += 1
        else:
            lines.append(f"\n[CLAUDE_LOG_ENTRY type=RESPONSE num={exchange_num} session={session_id}]")
            lines.append(f"timestamp: {timestamp}")
            lines.append(f"time: {time_str}")
            lines.append(f"chars: {len(content)}")
            lines.append(f"\n{content}\n")

    output_path.write_text('\n'.join(lines))


if __name__ == '__main__':
    main()
```

---

## settings.json hooks

Merge into `~/.claude/settings.json` (preserving any existing hooks):

```json
{
  "hooks": {
    "UserPromptSubmit": [
      {
        "hooks": [
          { "type": "command", "command": "python3 ~/.claude/extract-log.py" }
        ]
      }
    ],
    "Stop": [
      {
        "hooks": [
          { "type": "command", "command": "python3 ~/.claude/extract-log.py" }
        ]
      }
    ]
  }
}
```

`UserPromptSubmit` writes the log as soon as a prompt arrives (so partial sessions are still captured if the agent crashes). `Stop` rewrites it at the end of the turn so the final assistant response is included.

---

## Why prompt-and-response only

- **Signal density.** A clean conversation log is readable later; a tool-call log is not.
- **PII / secret hygiene.** Tool outputs often include env values, DB rows, API responses. Keeping them out of git history is a feature.
- **Reviewer ergonomics.** The log answers "what did the human ask, what did the agent commit to?" — the diff answers "what did the agent do." Keeping them separate makes both more useful.
- **Repo size.** Tool transcripts are huge. Prompt/response transcripts are kilobytes per session.

---

## Per-project commit policy

In each repo's `CLAUDE.md`, add:

```
## Session Logs

Always commit `.claude-logs/` with your changes.
```

That's the entire enforcement mechanism. The log is generated automatically; the agent commits it as part of the normal "stage everything that changed" flow.

If a repo should *not* track logs (e.g. a public OSS project), add `.claude-logs/` to its `.gitignore` instead.

---

## Other agents

The script above is Claude Code-specific because it reads from `~/.claude/projects/<dashed-cwd>/*.jsonl`. To port it:

| Agent | Transcript location | Notes |
| --- | --- | --- |
| Claude Code | `~/.claude/projects/<dashed-cwd>/*.jsonl` | Native — use the script as-is. |
| OpenAI Codex CLI | `~/.codex/sessions/<id>.jsonl` (varies by version) | Schema differs: messages have `role` + `content` directly; no `isMeta`/`isSidechain`. Adapt `is_user_prompt` and `extract_assistant_text` accordingly. |
| Cursor agent | No on-disk transcript by default | Out of scope — would need to hook the agent's request/response stream. |
| Aider | `.aider.chat.history.md` in cwd | Already markdown. Either commit it directly or strip tool calls with a small regex pass. |

For any agent: the rule is **read its own transcript, write only user-text + final-assistant-text to `.claude-logs/<timestamp>_<session>.md`, run on prompt-submit and stop**. Keep the output filename pattern identical so a single repo can hold logs from multiple agents without collisions.

---

## Troubleshooting

- **No log file appears.** Check `~/.claude/projects/` exists and contains a directory matching your cwd with `/` replaced by `-` (leading dash kept). The script silently exits if the session dir doesn't exist.
- **Log is empty.** Likely the session has only sidechain/agent-prefixed JSONL files. The script ignores `agent-*.jsonl` on purpose (subagents shouldn't pollute the main log).
- **Prompts contain pasted secrets.** The script doesn't redact. If this is a concern, add a redaction pass in `extract_clean_log` before writing.
- **Multiple sessions in one repo on the same day.** Each session gets its own file (named by session ID), so there's no overwrite risk.
