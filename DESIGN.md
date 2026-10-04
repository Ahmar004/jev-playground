# Design - Jev's Playground

Status: approved in Step-3 and revised in Step-4 (2026-10-01). This file says how each feature in `spec.md` is built, front end and back end, and ends with the ordered slice plan Step-6 follows. `spec.md` says what we build, `TECH-STACK.md` what we build it with. If this file disagrees with either, stop and ask the user.

## 1. Decisions made in Step-3

- Claude writes every content item and its correct answer, in the slice that needs it. The user spot-checks the JSON before it is recorded.
- Races run one call per item, and both racers always get the same number of parallel lanes (4). A "Skip to result" button jumps to the real final numbers.
- In Beginner mode, Jev faces Claude Opus 5.5 by default everywhere (levels, games, Arena). The opponent picker switches to Sonnet 5.5 or Haiku 4.5.
- Colors: Jev teal, LLM violet, Code slate (section 13).
- Developer mode models without a stored price show real token counts and "price unknown". Cost is never estimated.
- The Leaderboard keeps one row per game, model and mode: the model's best result plus a run count.
- DESIGN.md holds the slice plan. At the start of each slice, Step-6 writes that slice's detailed plan with the writing-plans skill in `docs/superpowers/plans/`, based on the code as it stands then.

Added in Step-4:

- If a recording doesn't show a level's lesson, the items are rewritten to target the weakness TypeSafe documents and recorded once more. Methodology says items were chosen this way. The same items are never re-run to get a different result (spec 12.4).
- Level 2 is "Write Me a Poem", not "Write Me a Haiku", so it can't be confused with the Haiku 4.5 model. It has no Jev judging step.
- If P0 slices fall behind, the user decides what to cut at that slice. Nothing is cut in advance.

## 2. Architecture

```
content/tasks/*.json ----> runner (src/runner/) ----> RunEvents ----> useRace() ----> pure views
                             ^              ^
      pnpm record (CLI) -----'              '---- browser, Developer mode (keys from KeysProvider)
content/recordings/<task>/<model>.json ----> replaySource() ----> the same RunEvents (Beginner mode)
```

Anything that runs a model is a **Task**: a content file of items, each with its correct answer. The runner turns a Task into results. Views never call the runner or a provider. They read one RunEvent stream, which comes from a Recording (Beginner mode) or live calls (Developer mode). So every level, game and Arena view serves both modes with one code path, and recorded and live numbers come from the same code (R92).

### 2.1 Code layout

| Path                                      | Holds                                                                                                                                                       |
| ----------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `content/`                                | Versioned JSON: tasks, levels, games, Arena presets, Sandbox templates, quizzes, glossary, prices, recordings. Only the recording CLI writes `recordings/`. |
| `src/lib/constants.ts`                    | Every enum-like value: modes, providers, racers, question kinds, task kinds, level status, XP sources, badge IDs, model IDs, `DEFAULT_OPPONENT`.            |
| `src/lib/links.ts`                        | Every in-app route.                                                                                                                                         |
| `src/runner/`                             | Plain TypeScript shared by the browser and the CLI: providers, request builders, parse, score, cost, lanes, Code racer, replay.                             |
| `src/content/`                            | Zod schemas and typed loaders for `content/`.                                                                                                               |
| `src/features/<area>/`                    | One folder per area (keys, race, levels, games, arena, sandbox, quizzes, progress, profile): pure components plus the hooks that drive them.                |
| `src/server/actions/`, `src/server/data/` | Server Actions (writes) and server data functions (reads), one file per area. The only callers of Prisma.                                                   |
| `src/server/auth/session.ts`              | `getSession()` and `requireUser()`.                                                                                                                         |
| `src/server/awards/`                      | The XP and badge engine.                                                                                                                                    |
| `scripts/record.ts`                       | The recording CLI.                                                                                                                                          |

Components stay pure: data in through props, actions out through callbacks. Timers, fetches and business logic live in hooks (`useRace`, `useKeys`, `useModelList`) or in the runner.

## 3. The runner (`src/runner/`)

### 3.1 Types

```ts
type RacerId = 'jev' | 'llm' | 'code' | 'jev_code' // jev_code: Jev's answer passed through a Code function
type ItemResult = {
	itemId: string
	ok: boolean // the call succeeded and the output parsed
	raw: string // provider body text, shown when parsing fails (R44)
	parsed: unknown | null
	correct: boolean | null // credit === 1; a parse failure or an error is a miss; null = "not scored"
	credit: number | null // 1 or 0, or the share right for fan_out; null = not scored
	latencyMs: number
	usage: { inputTokens: number; outputTokens: number }
	costUsd: number | null // null means "price unknown"
	error?: ProviderErrorKind
}
type RunTotals = {
	items: number
	scored: number // items with a stored answer
	correct: number // items with full credit
	accuracy: number | null // total credit / scored; null when nothing is scored
	wallMs: number // first start to last finish
	costUsd: number | null
	inputTokens: number
	outputTokens: number
	parseFailures: number
}
type RunEvent =
	| { type: 'item_started'; racer: RacerId; itemId: string; lane: number; atMs: number }
	| { type: 'item_finished'; racer: RacerId; lane: number; atMs: number; result: ItemResult }
	| { type: 'run_finished'; racer: RacerId; atMs: number; totals: RunTotals }
```

### 3.2 Modules

- **`providers/{typesafe,openrouter,anthropic,openai,google}.ts`**: `call(body, key, signal) -> { raw, latencyMs, usage, modelId }`. One `fetch` timed with `performance.now()`, no retries, with Zod schemas that match the real payloads. A non-2xx status maps to a `ProviderError` (section 12). Provider rules:
  - Anthropic calls send `anthropic-dangerous-direct-browser-access: true`.
  - Google keys go in `x-goog-api-key`, never `?key=`.
  - TypeSafe calls from the browser go to `/api/jev` (section 5.3), and latency is taken from its `Server-Timing` upstream value. The CLI calls TypeSafe directly.
  - Jev's model ID is the versioned `model` field of its response (for example `jev-1.13.0`).
- **`jev-request.ts`**: builds the Jev body `{ model: 'jev-latest', state, questions }` from an item. Question shapes, verified against docs.typesafe.ai on 2026-10-01:
  - Noul `{ type: 'noul', instructions, criteria?: { true, false } }` returns `{ noul }`.
  - Choice `{ type: 'choice', instructions, criteria: { option: description } }` returns `{ choice, probabilities, confidence }`.
  - Score `{ type: 'score', instructions, criteria: [level0, level1, ...] }` returns `{ score, probabilities, legend, confidence }`.
- **`llm-prompt.ts`**: builds one prompt from the same item: the same state, the same instructions, the same option or level set, and a fixed JSON answer format (R92). Every LLM runs at its provider's default settings. Opus 5.5 can't turn thinking off, so it runs at low effort. Methodology states both. When a task leaves `llm` out, the LLM's question is derived from Jev's, so the two can't drift.
- **`parse.ts`**: Jev answers go through Zod. LLM text has code fences stripped, then `JSON.parse`, then Zod. Any failure becomes `{ ok: false, parsed: null, raw }`, which counts as a miss and is shown with a "couldn't parse" note (R44).
- **`score.ts`**: correctness per task kind:

  | Task kind    | Jev correct when                                                                | LLM correct when                      |
  | ------------ | ------------------------------------------------------------------------------- | ------------------------------------- |
  | `choice`     | `choice` equals the label                                                       | the answer equals the label           |
  | `noul`       | `noul >= 0.5` matches the boolean label                                         | the boolean matches                   |
  | `score`      | `abs(score - label) <= 0.5`                                                     | the integer equals the label          |
  | `fan_out`    | per question as `noul`; item accuracy is the share right                        | per field                             |
  | `find_lines` | F1 of lines with `noul >= 0.5` against the answer lines, correct when F1 >= 0.8 | F1 of returned line numbers, same bar |
  | `generate`   | not applicable; the result is shown, not scored                                 | output parses as non-empty text       |

- **`cost.ts`**: `inputTokens x inputPrice + outputTokens x outputPrice`. The price comes from `content/prices.json` (dated, with source URLs; Jev, Anthropic, OpenAI and Google, matched by exact model ID), from OpenRouter's model list, or from OpenRouter's `usage.cost`. Otherwise it is `null` ("price unknown"). A promotional price carries `validUntil` and counts as unknown after that day. The price used is saved with each result. Jev output tokens are free.
- **`code/*.ts`**: the Code racer. Deterministic functions (count items, sum, compare dates), timed, $0.
- **`combine`**: a task may set `combine: codeFnId`. The runner applies that Code function to Jev's parsed answer and scores the result as the `jev_code` racer, shown as "Jev + Code". Its latency is Jev's latency plus the function's time, and its cost is Jev's cost. Recordings store only Jev's own results, and the runner derives `jev_code` from them in both modes. Level 3's fix and level 5's weighted composite use it. Level 5 passes the user's slider weights in as arguments, so views never compute a score. On a combine task the item's label is the combined answer's label: Jev alone is not scored there, and the LLM answers the task's `llm` question.
- **Unscored items**: an item with no stored answer (an Arena custom task) gets `correct: null`, shows "not scored", and is left out of accuracy. In level 8 Developer mode, the answer the user states is the item's answer.
- **`run.ts`**: `runItems(task, racer, runItem, { lanes, signal, onEvent })`, where `runItem` is the racer's `ItemRunner` (`jevRacer`, `llmRacer` or `codeRacer`, in `racers.ts`). Provider calls are passed in with the key bound, so the runner never holds a key. It runs items in order over `lanes` parallel slots (`RACE_LANES = 4` for every racer). Abort through `signal`. A non-abort error in one lane stops the other lanes.
- **`replay.ts`**: `replaySource(recording, { onEvent, signal })` fires each recorded event at its recorded offset, so replays play at real speed (R7). It returns `{ skip, done }`: `skip()` emits all remaining events at once, and `done` resolves when the last event fires, after `skip`, or on abort.

### 3.3 `useRace` (`src/features/race/use-race.ts`)

`useRace({ task, entries, combineArgs, live })` replays each entry's recording, or with `live` (one `ItemRunner` per racer, wrapped in `stopOnProviderFailure`) runs real calls through `runItems`, collects events into per-racer state, and returns `{ status, racers, perRacer, elapsedMs, startedAt, failure, start, skip, cancel }`. A live run stops on a failure that would repeat on every call (bad key, 403, rate limit, overload, network): `failure` names the kind and the racer, the results so far stay, and the view offers Retry and "Use Beginner mode instead" (R81). A malformed answer to one item is a result, not a stop.

- Beginner mode: `skip` jumps to the recorded totals.
- Developer mode: there is nothing to skip, because results land as calls finish, so the Skip button is hidden.
- Before a live run starts, the view shows how many calls each racer will make.
- The race view animates from this state with Motion, and the scoreboard shows accuracy, time and cost per racer.

## 4. Content and Recordings

### 4.1 Files

| File                                           | Shape (Zod schema in `src/content/`)                                                                                                                                                                                                                                                                                  |
| ---------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `content/tasks/<taskId>.json`                  | `{ id, kind, version, jev: { questions } \| { perLine } \| { raw }, llm?: question \| { instructions }, code?: codeFnId, combine?: codeFnId, items: [{ id, state, label?, note?, questions? }] }`                                                                                                                     |
| `content/levels/<levelId>.json`                | `{ id, order, title, learn: { intro, compare: [{ racer, title, points }] }, predict: { questions: [{ metric, prompt }] }, tasks: [{ id, title, judged? }], widget?, reveal: { why: [text] }, docs: [{ path, title }], check: [question] (slice 5) }`; Reveal's numbers come from the recordings, never from this file |
| `content/games/<gameId>.json`                  | `{ id, priority, title, useCase, taskId, lesson, docs }`                                                                                                                                                                                                                                                              |
| `content/arena/presets.json`                   | `[{ id, title, taskId, itemId, batchTaskId? }]`                                                                                                                                                                                                                                                                       |
| `content/sandbox/templates.json`               | `[{ id, title, state, questions }]`                                                                                                                                                                                                                                                                                   |
| `content/quizzes/{start,end}.json`             | `{ id, title, intro, questions: [{ id, prompt, answer, explanation, topic }] }`; `answer` is `jev`, `llm` or `code` and `topic` is a level id                                                                                                                                                                         |
| `content/glossary.json`                        | `[{ term, definition }]`                                                                                                                                                                                                                                                                                              |
| `content/prices.json`                          | `{ checkedOn, models: { [modelId]: { provider, inputPerM, outputPerM, source, validUntil? } } }`                                                                                                                                                                                                                      |
| `content/recordings/<taskId>/<modelSlug>.json` | `{ taskId, taskHash, racer, modelId, recordedAt, price, lanes, events: [{ itemId, lane, startMs, endMs, ...ItemResult }], totals }`                                                                                                                                                                                   |

Content is imported, not fetched, so it renders at build time and Beginner mode never touches the database or a model API (R76). `src/content/tasks.ts` and the server-only `src/content/recordings.ts` import every file by name; a Vitest test fails when a file on disk is missing from them. A Vitest test parses every file, and a bad file also fails `next build` at prerender. `taskHash` is a hash of the task file. The UI shows a recording only when its hash matches the current task, so edited content can never show stale results. A Vitest test fails when any task lacks a hash-matching recording for Jev and all three Claude models (Jev only for Sandbox templates), so Beginner mode never has a gap.

Recordings ship per page, not in a shared bundle (R79). A page's server component loads only that page's recordings and passes them to its client components as props. No client module imports `content/recordings/`.

### 4.2 Recording CLI (`pnpm record`)

`scripts/record.ts`, run with `tsx`, imports the runner.

- Flags: `--task <id>`, `--model <id>`, `--dry-run`.
- It reads `TYPESAFE_API_KEY` and `ANTHROPIC_API_KEY` from `.env.local`. These are owner-only, documented in `.env.example`, and never read by app code.
- It records Jev plus Haiku 4.5, Sonnet 5.5 and Opus 5.5 for every item, at 4 lanes, skipping tasks whose `taskHash` is unchanged.
- `--dry-run` estimates input tokens (characters / 4) times price, plus an output allowance of 500 tokens per LLM call, and spends nothing.
- A real run prints each call, then this run's cost and the cost of every recording on disk against the $20 Anthropic credit (ROADMAP Rule-0.1). The CLI refuses to start a run whose dry-run estimate would push that total past $20.
- A run never edits a result: an unparseable or malformed answer is stored as it happened. A provider-side failure (rate limit, overload, network) stops that model's run and writes nothing, because it measures the account, not the model.
- The owner removes the keys from `.env.local` when recording is done (R22).
- Every recording run costs money, so Step-6 asks the user before each one and shows the dry-run cost first.

## 5. Modes and keys

### 5.1 Mode

The mode lives in a React context and is not saved. Every page load starts in Beginner mode, because keys vanish on reload, so Developer mode would have nothing to run with. Switching to Developer mode with no keys opens the Keys panel (spec 3.1). Every result shows a `ModeLabel`: "Beginner mode - recorded 2026-10-02 - claude-opus-5-5" or "Developer mode - run 14:02 - <model ID>" (R6, R13, R84). A page-level banner states what the current mode means (R84).

### 5.2 Keys (`src/features/keys/`)

- `KeysProvider` holds `{ [provider]: { key, keyId } }` in `useState`, mounted once in the signed-in layout. `keyId` is a random ID made when the key is pasted. Query keys, analytics and logs use `keyId` or the provider name, never the key.
- The Keys panel is a Radix Dialog side sheet with one row per provider (TypeSafe, OpenRouter, Anthropic, OpenAI, Google). Each row has:
  - a password input marked `ph-no-capture`;
  - Test (a cheap real call: the model list, or for TypeSafe `GET /v1/models` through `/api/jev`);
  - Remove;
  - plain-language text on where the key goes and what happens to it;
  - a revoke link to the provider's key page (R19).
    The panel also has "Remove all" (R20).
- `useModelList(provider)` fetches the provider's model list with TanStack Query, keyed on `[provider, keyId]` (R10, R42).
- Jev provider: a TypeSafe key only, through `/api/jev`. OpenRouter serves Jev too (it allows browser calls to `/api/v1/systemone`), but its response shape could not be verified without a real key, so it is not built (user decision, slice 8). OpenRouter is an LLM provider here (chat completions, with prices from its model list).
- Slice 8 built the live path for the races on the Play step. Level 6 runs live too (ROADMAP Step-11): after the sort, `useLiveRouter` runs each card's first item for Jev and the LLM through `liveRunners` (the shared runner), RACE_LANES calls at a time per tool, and Code runs in the browser. Level 8 runs live too (ROADMAP Step-12): above the recorded pairs, the user writes a message and states the right answer, and `useLiveTrick` sends it to Jev alone (TypeSafe key only, `LiveSetup.jev`) through `jevRacer`, one call per attempt. A reply that does not parse, or a request Jev turns down, is a miss with its raw reply shown (R44).

### 5.3 TypeSafe pass-through (`POST /api/jev`, Node runtime)

- It requires a signed-in session, so it is not an open proxy.
- It forwards only to the fixed `https://api.typesafe.ai/v1/systemone` (and `GET /v1/models` for Test), never to a caller-given URL.
- Body cap: 256 KB.
- It copies the `Authorization` header through and returns TypeSafe's status and body, plus `Server-Timing: upstream;dur=<ms>`.
- It logs only status and duration. It never logs, stores or sends to Sentry the key or the body (R18).
- It is a hand-written handler, not `createApiRoute`, because the factory's error path reads the body. It runs on Node, the default: `export const runtime` is not allowed with `cacheComponents`.
- `GET /api/jev` forwards to `https://api.typesafe.ai/v1/models` for the Keys panel's Test.

### 5.4 Browser hardening

- A Content-Security-Policy with only a `connect-src` allowlist (`src/lib/csp.ts`, set in `next.config.ts`): `'self'`, OpenRouter, Anthropic, OpenAI, Google Generative Language, the Supabase project URL, PostHog and Sentry ingest. If a script were ever injected, the browser still refuses to send a key to any other host. `next dev` also needs `ws:` (hot reload), so that is added in development only; the production policy stays strict. No `script-src` is set, so `'unsafe-eval'` is not needed.
- User text and model output render only as plain text. `dangerouslySetInnerHTML` is banned (R86).

## 6. Screens

Every route below is in `src/lib/links.ts`. A header link is added only in the slice that builds its page. Rendering follows `TECH-STACK.md` > Rendering strategy.

| Route                           | Screen        | Render                   | Contents                                                                                                                                                |
| ------------------------------- | ------------- | ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/sign-in`                      | Sign-in       | SSG                      | Tabs: Sign in / Create account. Email and password. No password-reset link (out of v1).                                                                 |
| `/`                             | Home          | PPR                      | Welcome, path progress, "Play level 1: Speed Race" (R65), optional start-quiz card (R57).                                                               |
| `/path`                         | Path          | PPR                      | 8 level cards with status and Skip / Revisit (R28).                                                                                                     |
| `/levels/[levelId]`             | Level         | SSG shell + CSR          | Stepper Learn > Predict > Play > Reveal > Check, with `?step=` in the URL.                                                                              |
| `/games`, `/games/[gameId]`     | Games, Game   | SSG + CSR                | Setup (opponent picker) > Race (scoreboard, Skip to result) > Summary (winner, why, numbers, docs link).                                                |
| `/arena`                        | Arena         | SSG + CSR                | Preset list (`?preset=`), side-by-side result, Share. Developer mode adds editable inputs, a "Custom task" tab and the model picker.                    |
| `/sandbox`                      | Sandbox       | SSG + CSR                | Templates, Form and JSON tabs kept in sync, weakness warnings, limit check, answer bars and gauges, Copy as code.                                       |
| `/quizzes`, `/quizzes/[quizId]` | Quizzes       | SSG + PPR                | Start and end quiz, one question per screen, results with explanations, solutions, improvement.                                                         |
| `/leaderboard`                  | Leaderboard   | PPR                      | Best per game, model and mode, sortable. Empty state: "Begin playing and testing out Jev and LLMs to fill up this leaderboard here."                    |
| `/profile`                      | Profile       | PPR                      | XP, badges, quiz improvement, completion card, my shares (with delete), sign out.                                                                       |
| `/glossary`                     | Glossary      | SSG                      | Every technical term in plain English (R74).                                                                                                            |
| `/methodology`                  | Methodology   | SSG                      | Same inputs and format, lanes, default settings, parse and scoring rules, how items are chosen, price and recording dates; load-test results (P1, R78). |
| `/s/[shareId]`                  | Shared result | per-request SSR, noindex | Read-only snapshot with its mode label and "Sign in to try it yourself". The only page reachable without signing in.                                    |

**Header (every signed-in page):** always one row. Left: the sidebar button and the "Jev's Playground" title (no logo icon). Then the links to Path, Games, Arena, Sandbox, Quizzes, Leaderboard and Profile (R66), shown from 1280 px. Right: the path progress bar n/8 (R67, in the sidebar on phones), the Beginner/Developer switch, the Keys button, the theme switch and the profile button, whose menu shows the email, a Profile link and Sign out. The sidebar (`src/features/shell/side-nav.tsx`) lists every page on every screen width; the links live in `nav-items.tsx`.

**Pop-ups and panels:**

- the Keys panel;
- the opponent picker (popover);
- the share consent dialog, then a "link created" dialog with Copy;
- the delete-share confirm;
- the Copy as code dialog (`curl` and TypeScript `fetch`, with the key as an env-var placeholder);
- level-complete and badge celebrations (canvas-confetti plus a toast);
- the provider-error notice with Retry and "Play the Beginner version".

**States:** every screen has a loading skeleton, an empty state and an error state. Long live runs show per-item progress (R80).

## 7. Levels

Each level is a content file (section 4.1) plus, where needed, one level-specific widget. Every level has 2 Check questions, scored on the server. Reveal compares the prediction with the result (R25), shows speed, cost and accuracy for every model involved (R26), and links to its TypeSafe docs page (R27). After a Developer mode run, Reveal also shows the last finished live run beside the recordings, each with its mode label (scoreboard rows for races, a live card list for level 6, the user's tricks for level 8). The live run stays in tab memory until a new run replaces it or the user leaves the level; it is never saved, and the prediction is still scored against the recordings.

| #   | Items                                                                                     | Jev                                                                                                                                         | LLM / Code                                                                                                                                                                                                                                                                     | Widget                                                         |
| --- | ----------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------- |
| 1   | 40 support tickets                                                                        | Choice from 5 categories                                                                                                                    | LLM picks from the same 5                                                                                                                                                                                                                                                      | race lanes and counters                                        |
| 2   | 3 poem topics                                                                             | A real request with a free-text question type. Whatever TypeSafe returns (a 422 is expected, confirmed at recording) is recorded and shown. | LLM writes a 4-line poem (`generate`)                                                                                                                                                                                                                                          | API response side by side                                      |
| 3   | 4 fruit lists, 4 tricky date pairs                                                        | Naive: Choice of a count, or first/second. Fix: one Noul per list item (fan-out), or Choice extraction of day, month and year               | LLM answers the naive form. Code sums the Nouls or compares the extracted dates (`combine`, section 3.2).                                                                                                                                                                      | before/after fix toggle                                        |
| 4   | 10 true/false statements                                                                  | Noul probability                                                                                                                            | The user answers each with a confidence slider (50-100%)                                                                                                                                                                                                                       | calibration chart, user vs Jev                                 |
| 5   | 6 product reviews (two races: 1 broad question, then 5 small questions)                   | 1 broad Noul, and 5 atomic Nouls combined in code (`combine`, `weighted_composite`) with slider weights the user sets                       | LLM broad judgment on both races                                                                                                                                                                                                                                               | weight sliders and live composite scores                       |
| 6   | 6 task cards (one single-item task each: ticket, sum, poem, scam message, dates, summary) | Recorded for every card; a text-writing card records Jev's real rejection                                                                   | LLM for every card; Code (`sum_numbers`, `compare_dates`) where a rule exists, "Code has no rule for this job" otherwise                                                                                                                                                       | dnd-kit sorting with tap buttons, then a per-card result table |
| 7   | 3 emails x 10 phishing signals                                                            | 10 Nouls in one request (fan-out)                                                                                                           | LLM returns 10 booleans                                                                                                                                                                                                                                                        | signals light up with probability (shown in Reveal)            |
| 8   | 6 recorded trick pairs (12 messages, plain vs tricked wording, one Noul question)         | Noul                                                                                                                                        | LLM on the same messages. Beginner mode: the user guesses per pair whether Jev is fooled (a pair counts as fooled when Jev gets the tricky wording wrong). Developer mode (slice 8): the user writes the text and states the right answer; if Jev disagrees, "you fooled Jev". | per-pair guess, then results                                   |

Across the path, Jev wins levels 1, 4 and 7, the LLM wins level 2, and Code wins level 3 (R29).

## 8. VS games

Every game uses the race view from section 3.3. The opponent defaults to Opus 5.5 in Beginner mode (section 1). Each game ends with a summary: winner, why, numbers and a docs link. Every finished run calls `recordGameRun` (section 11).

| Game                   | Priority | Items                               | Task kind                                                              | Animation                                                                                                            |
| ---------------------- | -------- | ----------------------------------- | ---------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| Guardrail Gauntlet     | P0       | 16 messages                         | Choice: pass / review / block                                          | messages rush a gate; each bouncer stamps its decision                                                               |
| Needle Hunt            | P0       | 3 documents x 30 lines              | `find_lines` (Jev: 30 Nouls in one call; LLM returns line numbers)     | lines light up as each racer answers                                                                                 |
| Number Crunch Showdown | P0       | 12 counting and arithmetic problems | Choice from the same 6 numeric options for both; Code computes exactly | two-lane duel; Code's result sits in the summary                                                                     |
| Review Tug-of-War      | P0       | 20 reviews                          | Score, 5 levels                                                        | each correct score pulls the rope toward that racer                                                                  |
| Smart Home Dash        | P1       | 12 voice commands                   | Choice from 6 devices                                                  | two robot runners reach the device before the next command                                                           |
| Twin Finder            | P1       | 16 product pairs                    | Noul "same product?"                                                   | pairs on conveyor belts get stamped                                                                                  |
| Confidence Catch       | P1       | 20 items                            | Choice with confidence; the threshold slider is local                  | answers fall into act / review; the slider sorts Jev's recorded answers (acted right, acted wrong, sent to a person) |
| Citation Cop           | P1       | 12 claims with sources              | Noul "does the source support it?"                                     | claims pass a checkpoint and get flagged                                                                             |

Level 1 (Speed Race) is also timed, so it writes Leaderboard entries under the game ID `speed-race`.

## 9. Arena, Sandbox and Quizzes

**Arena (R39-R46):**

- 8 single-item presets: ticket triage, prompt-injection check, review rating, product match, citation check, intent routing, date extraction and phishing fan-out. Product match, citation check and intent routing come from P1 games, so slice 10 writes and records those three tasks, and slice 13's games reuse them.
- A result shows each answer, Jev's probabilities and confidence, latency, cost and the mode label. An unparseable LLM output shows the raw text with a "couldn't parse" note.
- Developer mode can edit the preset inputs, or write a custom task (state plus one question), and pick the LLM.
- P1 batch mode (`/arena/batch/[presetId]`) runs a preset's whole recorded task through the race view in both modes (R45). It is offered when the task has at least 12 items (`ARENA_BATCH_MIN_ITEMS`), so 6 of the 8 presets have it; there is no separate 25-item task, because the existing recordings already show speed and cost at scale. Batch runs are not scored for XP, saved or shared.
- Share: see section 11.

**Sandbox (R47-R54):**

- 6 templates, each a Task of kind `sandbox` (Jev only, any mix of Noul, Choice and Score questions, never scored) with one Jev recording; `pnpm record` records only Jev for these. Beginner mode replays an unchanged template; an edited setup needs Developer mode and a TypeSafe key, and runs through `jevRacer` and `/api/jev`.
- The Form view and the JSON view edit one state object, and each re-renders from it, so they can't drift (R48).
- Answers render as bars (Choice and Score probabilities) and gauges (Noul, confidence) (R51).
- Weakness warnings come from simple rules on the question text and input size: count or how-many words, arithmetic, date words, write or generate verbs, or an estimated state over 8k tokens (R52).
- The limit check estimates tokens as characters / 4 and blocks the send, with a clear message, when state plus the longest question is over 32k, the total is over 64k, a Choice has more than 255 options, or a Score has fewer than 2 or more than 10 levels (R53). The check is labelled as an estimate. A 422 from TypeSafe is shown in plain language.
- Running needs Developer mode with a Jev key (R50).
- Copy as code gives a ready-to-run `curl` and a TypeScript `fetch` (R54).

**Quizzes (R56-R60):**

- The start and end quizzes each have 8 "which tool fits?" items (answers Jev, LLM or Code), one per level topic, with different items in each quiz.
- One question per screen. The answers and explanations stay on the server until the quiz is submitted; the results then show every pick, the right answer and its explanation, which are the solutions (R58, R60). Each quiz is scored once per user (the first submit); there is no retake.
- Scores are computed on the server.
- If both quizzes are done, Profile and the end-quiz result show the improvement (R59).

## 10. Progress, XP, badges and Leaderboard

**XP.** Every award is an `XpEvent` row, unique on (userId, source, sourceId), so a replay can never award twice.

| Source (`XP_SOURCES`) | When                                      | XP  | sourceId               |
| --------------------- | ----------------------------------------- | --- | ---------------------- |
| `level_done`          | Reveal reached and Check answered         | 100 | levelId                |
| `check_correct`       | a correct Check answer                    | 20  | questionId             |
| `prediction_correct`  | a correct prediction                      | 25  | levelId                |
| `game_done`           | a finished VS game                        | 50  | gameId:opponentModelId |
| `quiz_correct`        | a correct quiz answer, first attempt only | 10  | quizId:questionId      |
| `arena_preset`        | the first run of an Arena preset          | 10  | presetId               |
| `dev_first_run`       | the first Developer mode live run         | 50  | `first`                |

**Badges** (`BADGES`), checked by `src/server/awards/` after every write, in the same transaction:

- `first_race`: finish level 1.
- `pathfinder`: finish all 8 levels. This unlocks the completion card.
- `right_tool`: sort every Router card correctly on the first try. The first "Run the pipeline" sends the sort (`submitFirstPlay`), checked on the server against the level content; only the first one, sent before the first Reveal, counts (`LevelProgress.firstPlay`).
- `phish_spotter`: finish level 7.
- `trickster`: in level 8, guess right for every pair whether the tricky message fools Jev, judged against Jev's recording (user decision, Step-7). The guesses go with the first Reveal (`submitFirstPlay`), and only that first try counts.
- `gamer`: finish all 4 P0 games.
- `oracle`: make 5 correct predictions.
- `quiz_climber`: score higher on the end quiz than on the start quiz.
- `live_wire`: finish a first Developer mode live run (a race, an Arena run or a Sandbox run that ends without a stopping failure). `recordDevRun` also pays `dev_first_run` once.
- `sharer`: create a first share.

**Completion card (Profile):** the completion date, total XP, badges, start and end quiz scores, and Jev's wins and losses across the path.

**Leaderboard:** one `LeaderboardEntry` per (user, game, model, mode). A run replaces the stored numbers only when accuracy is higher, or equal with a lower time. It also increments `runs`. It stores numbers and model IDs only, never task text (R64).

## 11. Data and server

### 11.1 Prisma models (one `.prisma` file per area)

| Model              | Key                                        | Fields                                                                                                                                                       |
| ------------------ | ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `User`             | `id` = Supabase auth UUID                  | email (existing)                                                                                                                                             |
| `LevelProgress`    | (userId, levelId)                          | status (`in_progress`, `done`, `skipped`; no row means not started), prediction (the saved picks), opponentModelId, predictionCorrect, revealedAt, updatedAt |
| `CheckAnswer`      | (userId, questionId)                       | levelId, optionId, correct, answeredAt                                                                                                                       |
| `QuizAttempt`      | (userId, quizId)                           | answers (question ID to the tool picked), score, createdAt                                                                                                   |
| `XpEvent`          | id, unique (userId, source, sourceId)      | xp, createdAt                                                                                                                                                |
| `UserBadge`        | (userId, badgeId)                          | earnedAt                                                                                                                                                     |
| `LeaderboardEntry` | id, unique (userId, gameId, modelId, mode) | accuracy, timeMs, costUsd (nullable), runs, updatedAt                                                                                                        |
| `Share`            | id (16 random bytes, base64url)            | userId, mode, payload (JSON), createdAt; index (userId, createdAt)                                                                                           |

Every table gets RLS enabled with no policies in its migration (`docs/rules/auth.md`, `pnpm check:rls`).

### 11.2 Trust rules

The server never trusts a client-computed result it can check itself:

- Check and quiz answers are scored on the server against the content JSON.
- In Beginner mode, predictions and leaderboard numbers are recomputed on the server from the recording files. The client sends only IDs.
- In Developer mode, only the browser saw the live call, so the client sends the numbers. They are range-checked and only affect the user's own board.

### 11.3 Server Actions

Every action is a `validatedAction`. Every action except `signIn` and `signUp` calls `requireUser()` first. Every write scopes by the session's user ID, never by a client-given ID.

| Action                                                                  | Does                                                                                                                                                                                                          |
| ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `setLevelStatus`, `submitPrediction`, `revealPrediction`, `submitCheck` | Progress plus XP and badges. `submitPrediction` saves the picks at Lock in. `revealPrediction` judges the first Reveal on the server against the opponent raced, and that result is final.                    |
| `submitQuiz`                                                            | Scores on the server, stores the attempt, awards XP.                                                                                                                                                          |
| `recordGameRun`                                                         | Leaderboard upsert, XP and badges (VS games and Speed Race).                                                                                                                                                  |
| `recordArenaRun`, `recordDevRun`                                        | XP and badges only. The Leaderboard covers timed games only (spec 10.5).                                                                                                                                      |
| `submitFirstPlay`                                                       | The first Router sort or trick guesses for a level, before its first Reveal. Stored once in `LevelProgress.firstPlay`; grants `right_tool` or `trickster` when every answer is right.                         |
| `createShare`                                                           | Validates the snapshot with Zod. Requires a consent flag when it holds user text. Caps it at 32 KB. Allows 20 shares per user per 24 hours, counted from `Share` rows (no in-memory counter). Returns the ID. |
| `deleteShare`                                                           | Checks ownership and deletes the row. The shared page reads the row on every request, so the link stops working at once (R87).                                                                                |
| `signIn`, `signUp`, `signOut`                                           | Supabase Auth through `src/lib/supabase/`. `provisionUser` runs on first sign-in.                                                                                                                             |

After a write, a progress action calls `refresh()` from `next/cache`, so the header bar and pages update at once. Per-user reads are not cached, so there is no tag to update. The client applies the change optimistically through TanStack Query, rolls it back on failure, and shows a toast.

### 11.4 Reads (`src/server/data/`)

`getProgress`, `getXpAndBadges`, `getLeaderboard`, `getQuizResults` and `getMyShares` read per-user data inside `<Suspense>` and are never cached. `getShare(id)` is not cached either: with `'use cache'` plus `updateTag`, a production build still served a deleted share once more (checked in slice 10), and R87 needs the link dead at once. `/s/[shareId]` calls `connection()` and reads `params` inside `<Suspense>`.

### 11.5 Auth and the gate

- `proxy.ts` calls `getClaims()`. With no valid claims, it redirects to `/sign-in`, except for `/sign-in`, `/s/*`, `/api/*` and static assets. A `fetch` can't use an HTML redirect, so each `/api/*` handler checks the session itself and returns a JSON 401.
- `getSession()` (wrapped in React `cache`) is the one session object for every signed-in UI decision. `requireUser()` throws an `AppError` (401) without one.
- The proxy check is optimistic. Every read and write re-checks the session.

### 11.6 Shared result page

A share payload holds the preset ID or the custom inputs, both racers' parsed answers and raw outputs, latency, cost, model IDs, the mode label and the run or recording date. The page renders it as plain text. Beginner shares keep "Beginner mode". Developer shares say "Developer mode, run by a user" (R46). `/s/*` sends `noindex` in both robots metadata and an `X-Robots-Tag` header.

## 12. Errors, observability and analytics

- **Provider errors.** Every provider maps failures to one `ProviderErrorKind`: `invalid_key` (401), `forbidden` (403), `rate_limited` (429), `overloaded` (529 or 503), `malformed` (400 or 422), `network`, or `unknown`. One copy module turns each kind into friendly text with Retry (R21, R82). `overloaded` and `network` also offer "Play the Beginner version" of the same screen (R81).
- **Server errors.** User mistakes in actions throw `AppError`. Everything else goes to `captureError` or `captureClientError` (`docs/rules/error-handling.md`).
- **Sentry.** `beforeSend` and the breadcrumb filter drop the `authorization`, `x-api-key` and `x-goog-api-key` headers, and the request bodies of provider and `/api/jev` calls.
- **PostHog.** It is anonymous, masks every input in session replay, and skips fields marked `ph-no-capture`. Events, through the typed taxonomy with IDs, enums and booleans only:
  - `level_started`, `level_completed`, `prediction_made`;
  - `game_finished`, `quiz_completed`, `share_created`;
  - `mode_switched`, `key_added` (provider name only).
- **Pino.** Server only, with redaction as a backstop. The pass-through logs status and duration only.

## 13. Design system

### 13.1 Tokens (`src/app/globals.css`)

Tokens are named by role, not value. Colors live on `:root`, with the dark set under `.dark` (the next-themes class, so the theme toggle works), and are re-exposed through `@theme inline`. Radii are 6 / 10 / 16 px (`--radius-sm`, `--radius`, `--radius-lg`). Spacing and type sizes use Tailwind's own scale. Type is Nunito through `next/font` (self-hosted at build).

| Token                                          | Light                       | Dark                        |
| ---------------------------------------------- | --------------------------- | --------------------------- |
| `--bg` / `--surface` / `--surface-hover`       | #F3E5C8 / #FFFBF3 / #F8EEDB | #0F1216 / #181C22 / #222830 |
| `--border` / `--border-strong`                 | #E3D1AD / #857A66           | #2C333C / #68737F           |
| `--text` / `--text-muted` / `--text-faint`     | #1F2328 / #56503F / #655E4C | #E1E8EF / #A5B1BD / #94A0AD |
| `--accent` / `--accent-hover` / `--accent-ink` | #1B7240 / #17633A / #FFFFFF | #6BC46D / #85D187 / #0F1216 |
| `--highlight` / `--highlight-ink`              | #F2A33A / #1F2328           | #F0883E / #0F1216           |
| `--success` / `--warning` / `--danger`         | #1B7240 / #8A5200 / #B42318 | #6BC46D / #DAAA3F / #F78A82 |
| `--jev` / `--llm` / `--code`                   | #0A706B / #7A3FD1 / #46566A | #39C5BB / #B69CFF / #9FB0C3 |

Also in `globals.css`: `--elev-1` / `--elev-2` (card and hover shadows, used as `shadow-card` / `shadow-card-hover` on every surface card), `--hue-1/2/3` and `--glow-strength` (the hues behind each page and the sign-in blobs: teal, orange top-right and purple at the bottom at 16% in light; calmer teal, slate blue and green at 14% in dark, because the bright racer colors looked loud on near-black), `--brand-gradient` (green to teal to purple in light, green to teal in dark). `HueBackdrop` (`src/components/hue-backdrop.tsx`) draws three large drifting hue blobs: `strong` on sign-in, `soft` (lighter in light, stronger in dark) and fixed to the viewport behind every signed-in page (`src/app/(app)/layout.tsx`), the type scale one step up from Tailwind's (xs 13, sm 15, base 17 px), and the animation keyframes (`animate-rise`, `pop-in`, `slide-in-*`, `grow-x`, `.skeleton` shimmer). Page blocks rise in on navigation (`src/app/(app)/template.tsx`). Every CSS animation stops under reduced motion.

Contrast was checked on 2026-10-02 (`src/app/theme-tokens.test.ts`):

- Every text token is at least 4.5:1 on `--bg` and `--surface` in its theme.
- `--border-strong` and the racer colors are at least 3:1.
- `--accent-ink` and `--highlight-ink` are at least 4.5:1 on their fills.
- `--highlight` is a fill for emphasis only and always carries `--highlight-ink` text.
- `--text-faint` is for placeholders on `--bg` and `--surface` only.

Recheck contrast whenever a value changes.

### 13.2 Racer identity

Jev, the LLM and Code each have one color and one icon, used everywhere, always with a text label (R72, R90):

- Jev: `--jev`, Lightning.
- LLM: `--llm`, Brain.
- Code: `--code`, BracketsCurly.

The icons come from `@/components/ui/icons`. A `RacerTag` component is the only way to render a racer's name.

### 13.3 Component conventions (from the template)

- Variant components use `cva`, composed through `cn()`. No hex colors, pixel radii or arbitrary values in components. A missing value means adding a token.
- Radix gives Dialog, Tabs, Slider, Switch, Tooltip, Popover and Toast. Hand-built SVG charts (bars, gauges, calibration chart, scoreboard) read token colors.
- Every interactive element has a visible `:focus-visible` state. Every input has a `<label>`. Icon-only buttons have an `aria-label`.
- Motion runs inside `LazyMotion` + `MotionConfig reducedMotion="user"`. canvas-confetti respects reduced motion.
- Layout is fluid and desktop-first, scaling down to 360 px phones with no separate mobile component trees (R73).

## 14. Testing

- **Vitest:**
  - providers against mocked `fetch` (every error status, header rules, no key in URLs);
  - parse, score and cost;
  - the lane scheduler and `replaySource` with fake timers;
  - content validation, `taskHash` matching, and a hash-matching recording for every task and model (section 4.1);
  - `combine` and unscored items;
  - every Server Action (validation, ownership, XP idempotency, share limits);
  - `useRace`, `useKeys` (a key never reaches any storage API).
- **Playwright:** one test per flow in section 15. Developer mode tests intercept the provider URLs, so no real key ever enters a test. Screenshots of every screen in both themes at 1280 px and 390 px.
- **Gates:** `local-review` before every commit (lint, typecheck, format, check:env, check:secrets, check:standards, test, build). `pnpm test` runs the template's `node:test` suites (script tests and logger contracts, which `check:standards` requires) and then `vitest run`.

## 15. Flows

1. Sign up > Home > Play level 1 > full loop > XP, badge and progress bar update.
2. Skip a level and revisit it from Path.
3. Play a VS game, switch the opponent, Skip to result > the Leaderboard entry appears.
4. Switch to Developer mode > Keys panel > paste and Test a key > live run > Remove all.
5. Arena preset > Share with consent > open `/s/<id>` signed out > delete > the link is gone.
6. Sandbox template > edit in Form, see the JSON in sync > over-limit block > Copy as code.
7. Start quiz > end quiz > improvement shown > solutions.
8. Invalid key, 429, or provider down > friendly message with Retry > Beginner fallback.
9. Theme toggle, keyboard-only pass and phone-width pass.

## 16. Slice plan

Step-5 (Foundation) comes first and is not a slice. Every P0 slice comes before any P1 slice. For each slice, Step-6:

1. writes the slice's plan with writing-plans in `docs/superpowers/plans/`;
2. writes tests first;
3. builds the slice;
4. runs `local-review`;
5. commits and pushes;
6. adds the `chore(logs)` commit.

A slice that adds content has its items spot-checked by the user and a recording run approved by the user (dry-run cost shown first).

| #   | Slice                           | Builds                                                                                                                                                                                     | Done when                                                                                                                   |
| --- | ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------- |
| 1   | Shell                           | Tokens and themes (next-themes, `.dark`), Nunito, `constants.ts`, `links.ts`, `LazyMotion` setup, sign-in and sign-up, `proxy.ts` gate, signed-in layout with the header, Glossary.        | Sign up, sign in and sign out work; the gate redirects; both themes pass the screenshot check; flow 9 passes for the shell. |
| 2   | Runner core                     | Task schema, `prices.json`, TypeSafe and Anthropic providers, `jev-request`, `llm-prompt`, parse, score, cost, `run.ts` lanes, Code racer, `combine`, `replaySource`, content loaders.     | Unit tests cover every module in section 3; no UI.                                                                          |
| 3   | Recording CLI + level 1 content | `pnpm record` with `--dry-run`, the Speed Race task (40 tickets), its first real recording, the Methodology page, the Commands-table row in `CLAUDE.md`.                                   | The recording file validates; the dry-run and real costs are printed; Methodology renders.                                  |
| 4   | Level loop + race view          | `useRace`, the race view and scoreboard, Skip, `ModeLabel`, `RacerTag`, the opponent picker, the level stepper with Learn, Predict, Play and Reveal for level 1 in Beginner mode.          | Level 1 plays from the recording at recorded speed, through Reveal, with every racer labelled.                              |
| 5   | Progress                        | Prisma models and migrations (with RLS), progress, check and prediction actions, the Check step, the XP and badge engine, Home, Path, the header progress bar.                             | Flows 1 and 2 pass, including level 1's Check; replays award XP once.                                                       |
| 6   | Levels 2-4                      | Content, recordings and widgets for Write Me a Poem, Count / Dates (4 stacked races: direct and after the fix, for fruits and for dates) and How Sure (rating form and calibration chart). | Each level plays its full loop in Beginner mode.                                                                            |
| 7   | Levels 5-8                      | Content, recordings and widgets for Break It Down, Router (dnd-kit plus tap), Spot the Phish and Trick Jev.                                                                                | All 8 levels play; the Router works by keyboard and touch.                                                                  |
| 8   | Developer mode                  | `KeysProvider`, the Keys panel, the OpenRouter, OpenAI and Google providers, `useModelList`, `/api/jev`, CSP, `ProviderError` copy, the live source in `useRace`, the Beginner fallback.   | Flows 4 and 8 pass; levels 1-8 run live against intercepted providers; the key-storage test passes.                         |
| 9   | VS games (P0) + Leaderboard     | The 4 P0 games (content, recordings, animations), `recordGameRun`, the Leaderboard page.                                                                                                   | Flow 3 passes in both modes.                                                                                                |
| 10  | Arena + Share                   | The 8 presets (with the 3 tasks slice 13 reuses), custom task, model picker, share consent, `createShare` and `deleteShare`, `/s/[shareId]`.                                               | Flow 5 passes, including the dead link after delete.                                                                        |
| 11  | Sandbox                         | Templates and recordings, Form and JSON sync, warnings, limit check, visual answers, Copy as code.                                                                                         | Flow 6 passes.                                                                                                              |
| 12  | Quizzes + Profile               | Both quizzes, `submitQuiz`, improvement, solutions, Profile with the badges grid, completion card and my shares.                                                                           | Flow 7 passes; every P0 row in spec 15 is built.                                                                            |
| 13  | VS games (P1)                   | Smart Home Dash, Twin Finder, Confidence Catch, Citation Cop.                                                                                                                              | Each plays in both modes and writes Leaderboard entries.                                                                    |
| 14  | Arena batch mode (P1)           | The 25-item batch task and the race view in Arena.                                                                                                                                         | Batch runs show speed and cost at scale in both modes.                                                                      |

The k6 load test and its Methodology results belong to Step-7 (R78, P1).
