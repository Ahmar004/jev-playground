# Jev's Playground - Product Spec

Status: approved in Step-0.1 (2026-10-01). This file replaces `docs/requirements.md` as the working source of what we build. Every original requirement keeps its number as a tag like `[R24]`, so nothing is lost and every line traces back to the brief. How we build it (tech stack, rendering, design) is decided in later ROADMAP steps, not here.

## 1. What this is

Jev's Playground is an interactive website that teaches people where System One models like Jev work well, where they break, and where a frontier LLM or plain code is the better tool. People learn through games, experiments and quizzes, and watch Jev and an LLM do the same task side by side. The site must be fun, playful, easy to navigate, light on text, and able to serve 1,000+ people at the same time.

### 1.1 Users [R0, R1]

| User                     | Needs                                                            | Mode           |
| ------------------------ | ---------------------------------------------------------------- | -------------- |
| Beginner (no API keys)   | Learn the difference with no setup, no keys and no code          | Beginner mode  |
| Developer (own API keys) | Run real experiments in real time with their own keys and models | Developer mode |

### 1.2 Vocabulary

Use these words consistently in UI, code and docs.

| Term           | Meaning                                                                                                                      |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Jev            | TypeSafe's System One model. Makes fast typed judgments; does not write text.                                                |
| LLM            | A frontier generative model (Claude, GPT, Gemini, ...). The "System Two" side.                                               |
| Code           | Plain deterministic code (counting, math, date comparison). The third tool.                                                  |
| State          | The input text or JSON that Jev judges.                                                                                      |
| Question       | One typed question about the state: Noul, Choice or Score.                                                                   |
| Noul           | Yes/no question; answer is the probability of yes (0-1).                                                                     |
| Choice         | Pick one option from a set (max 255); answer is the option, a probability per option, and confidence.                        |
| Score          | Rate against 2-10 ordered levels; answer is a probability-weighted score, a probability per level, a legend, and confidence. |
| Confidence     | 0-1 value on Choice and Score answers saying how certain Jev is; used to decide whether to act.                              |
| Beginner mode  | Replays real pre-recorded results. No keys, no live calls.                                                                   |
| Developer mode | Live calls with the user's own keys.                                                                                         |
| Recording      | One stored, real result from the owner's keys, used by Beginner mode.                                                        |
| Level          | One lesson on the learning path.                                                                                             |
| VS game        | An animated race where Jev and an LLM do the same job.                                                                       |
| Arena          | Side-by-side comparison of Jev and an LLM on a task.                                                                         |
| Sandbox        | Hands-on builder for Jev states and questions.                                                                               |
| Racer          | Jev or the LLM inside a game.                                                                                                |

## 2. Facts about the models (verified 2026-09-30)

These facts drive several features. Re-check them if a model version changes.

### 2.1 Jev API

- Endpoint: `POST https://api.typesafe.ai/v1/systemone`, `Authorization: Bearer <key>`. Body: `model` (`jev-latest`), `state` (string, object or array), `questions` (a map of named questions). Response: `model` (the versioned ID that answered, e.g. `jev-1.13.0`), `answers` (same keys), `usage.input_tokens` / `output_tokens`.
- Also served by OpenRouter at `POST https://openrouter.ai/api/v1/systemone` (model `typesafe/jev-1.13`, response includes `usage.cost`).
- Price: $0.042 per million input tokens; output tokens are free.
- Latency: roughly 70-500 ms, most around 100 ms.
- Limits: 64k tokens per request (state plus all questions); 32k tokens for state plus the longest question; Choice max 255 options; Score 2-10 levels. Rate limits are 100K tokens/s and 40 requests/s per account, and TypeSafe says they can change without notice. [R97]
- Input is text only; English is where it is most accurate. [R96]
- Errors: 401 invalid key, 422 malformed request, 429 rate limited, 529 overloaded.
- `GET /v1/models` lists available model names.
- TypeSafe paused new signups on 2026-09-22, so many developers can only reach Jev through OpenRouter.

### 2.2 Known Jev weaknesses (TypeSafe's "Jev 1.13 jaggedness" page)

Literal reading of wording; math and numbers (including counting); date and time comparison; indirection (multi-hop or double negatives); large state full of irrelevant detail; adversarial text in the state; instructions and criteria that contradict; structural invariants between separate questions; and text generation. Levels and games are built around these.

### 2.3 Browser access per provider (CORS preflight from `http://localhost:3000`)

| Provider                  | Direct browser call allowed?                 | So Developer mode calls go                 |
| ------------------------- | -------------------------------------------- | ------------------------------------------ |
| TypeSafe (Jev)            | No ("Disallowed CORS origin")                | Through our server as a pass-through [R18] |
| OpenRouter (Jev and LLMs) | Yes                                          | Browser to OpenRouter directly [R17]       |
| Anthropic                 | Yes (needs the direct-browser-access header) | Browser directly [R17]                     |
| OpenAI                    | Yes                                          | Browser directly [R17]                     |
| Google (Gemini)           | Yes                                          | Browser directly [R17]                     |

This answers the requirements' open question: TypeSafe does not allow browser calls, so TypeSafe-key Jev calls use the server pass-through.

### 2.4 TypeSafe docs we link to [R27]

Base: `https://docs.typesafe.ai`. Pages used by levels and games: `/concepts/system-one`, `/primitives/noul`, `/primitives/choice`, `/primitives/score`, `/confidence`, `/patterns/fan-out`, `/patterns/confidence-routing`, `/patterns/composite-scoring`, `/patterns/intent-routing`, `/model-jaggedness/jev-1.13` (sections: generation, math-and-numbers, date-and-time-comparison, literal-reading, adversarial-content), `/cookbooks/date_extraction_cookbook`, `/cookbooks/semantic_find`, `/cookbooks/rerank_typesafe`, `/cookbooks/llm_guardrails`, `/cookbooks/function_calling`, `/cookbooks/entity_alignment`, `/cookbooks/citation_check`.

## 3. The two modes

### 3.1 Switching [R2]

A Beginner/Developer switch sits in the header on every page. Anyone can switch at any time. Switching to Developer mode with no keys opens the Keys screen. Every page tells the user plainly: in Beginner mode everything shown is pre-recorded; in Developer mode every call happens live, and every response comes from the actual provider APIs, using the user's own keys. [R84]

### 3.2 Beginner mode

- All built-in content (levels, games, quizzes, Arena presets, Sandbox templates) is pre-recorded with the owner's Jev and Anthropic keys, then replayed in the browser. Public visitors never trigger a call on the owner's keys. [R3]
- LLM recordings are made with Claude Haiku 4.5 (`claude-haiku-4-5-20251001`), Claude Sonnet 5.5 (`claude-sonnet-5-5`) and Claude Opus 5.5 (`claude-opus-5-5`). In games and Arena presets the user picks which of the three Jev faces. [R4]
- Recordings are real outputs with real latency, token counts and cost. They are never invented or edited. [R5]
- Every Beginner mode result carries a "Beginner mode" label, the model ID, and the date it was recorded. [R6]
- Replays animate at the recorded speed, so users feel the real latency difference. [R7]
- Beginner mode works even when every model API is down. [R76]

### 3.3 Recording (owner only)

- An owner-only recording tool runs every built-in item against Jev and the three Claude models and stores the results as data: inputs, raw outputs, parsed answers, parse success or failure, latency, input and output tokens, cost, the price used, model ID and date.
- The owner can re-record all content when a model version changes, without code changes. [R8]
- The recording tool is a local CLI the owner runs. The owner checks the results by playing them in Beginner mode on localhost. Owner keys live only in the owner's `.env.local`, only while recording, and never reach the browser or the repo. When recording is done, the owner removes them. [R22]
- Recording and Developer mode share one runner (the same tasks, provider calls and scoring), so recorded and live results come from the same code. [R92]
- Each recording run prints its total cost against the budget.
- Every recording run, together, must fit in the $20 Anthropic credit (ROADMAP Rule-0.1).

### 3.4 Developer mode [R9-R14]

- Users paste their own keys and run tasks live. Every response comes from the actual provider APIs. [R9]
- Supported providers: Jev via a TypeSafe key (Jev through an OpenRouter key is not built: its response shape could not be verified without a real key); LLMs via Anthropic, OpenAI, Google [R11, R12] or OpenRouter.
- With an LLM key, the user picks from the models that key can reach, loaded from the provider's model list. [R10, R42]
- Developer mode results carry a "Developer mode" label, the model ID, and the run time. [R13]
- Every built-in game and level can be played in Developer mode once the needed keys are pasted. [R14]
- Long-running calls show progress, and the site never looks frozen. [R80]
- Load is spread across users' own provider limits, not a shared limit. [R77]

## 4. User key safety [R15-R21]

- Keys are never stored in a database, never logged, and never sent to analytics. [R15]
- Keys live only in the tab's memory and disappear when the tab closes. There is no "remember me" option, and keys are never written to local storage, session storage, cookies or IndexedDB (ROADMAP Rule-8). [R16]
- OpenRouter, Anthropic, OpenAI and Google calls go straight from the browser to the provider, so those keys never reach our server. [R17]
- TypeSafe-key Jev calls go through our server, which forwards the request and returns the answer without storing or logging the key or the request body. The Keys screen says so plainly. [R18]
- The Keys screen explains, per provider, in plain language: what happens to the key, where it is sent, and how to revoke it at the provider (with a link to that provider's key page). [R19]
- One click removes all keys; each key can also be removed on its own. [R20]
- Error tracking, analytics and logs never see keys. Key fields are excluded from analytics capture and session replay, error reports are scrubbed of auth headers and key parameters, and the server logger redacts them. Google keys are sent in a header, never in the URL. [R15]
- Invalid keys, missing permissions, rate limits (429), overload (529) and malformed requests are shown as clear, friendly messages with a retry. [R21, R82]
- If a provider is down, the affected Developer mode feature says so and offers the Beginner mode version of the same thing. [R81]

## 5. Pages and navigation

### 5.1 Pages

| Page          | Purpose                                                                                                                          |
| ------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| Sign-in       | Separate first page. Email and password sign-up and sign-in. No other page can be reached without signing in. [R55]              |
| Home          | Welcome, path progress, one-click "Play level 1: Speed Race", optional start quiz.                                               |
| Path          | The 8 levels with status (not started, in progress, done, skipped).                                                              |
| Level         | One level's Learn, Predict, Play, Reveal and Check steps.                                                                        |
| Games         | The VS games.                                                                                                                    |
| Game          | One VS game.                                                                                                                     |
| Arena         | Side-by-side comparisons.                                                                                                        |
| Sandbox       | Jev state and question builder.                                                                                                  |
| Quizzes       | Start quiz and end quiz, with results and solutions.                                                                             |
| Leaderboard   | The user's own model results in timed games.                                                                                     |
| Profile       | XP, badges, quiz improvement, completion card, sign out.                                                                         |
| Keys          | Paste, test and remove keys; plain-language safety info. Opens as a panel from the header.                                       |
| Glossary      | Plain-English definitions of every technical term. [R74]                                                                         |
| Methodology   | How every comparison is made and recorded, open to every signed-in user. [R93] Also hosts the published load-test results. [R78] |
| Shared result | Public read-only view of a shared comparison (the one page reachable without signing in, so a link can be opened by anyone).     |

Note on sign-in vs sharing: R55 requires sign-in for every page, and R46 requires sharing by link. A shared result is useless if the recipient can't open it, so the shared result page is the single public exception. It is read-only and shows a "Sign in to try it yourself" button. Confirmed by the user in Step-0.1.

### 5.2 Header (every signed-in page)

- Links to Path, Games, Arena, Sandbox, Quizzes, Leaderboard and Profile, each one click away. [R66]
- A path progress bar that is always visible. [R67]
- The mode switch, the theme switch and the Keys button.
- On mobile the links collapse into a menu that is still one tap away.

### 5.3 First run

After the first sign-in, Home shows one button that starts level 1 (Speed Race) in one click. [R65] The start quiz is offered next to it, never forced. [R57]

## 6. Learning path [R23-R29, R61]

### 6.1 Rules

- 8 levels in a suggested order. None is locked; users explore in any order. [R23]
- Every level follows the same loop [R24]:
  1. **Learn**: a short concept, mostly a diagram or animation.
  2. **Predict**: the user guesses the outcome (who wins, which answer, how confident).
  3. **Play**: the task runs, animated.
  4. **Reveal**: what happened and why, with real numbers.
  5. **Check**: a quick 1-2 question check. [R61]
- Reveal compares the user's prediction with the actual result [R25], shows speed, cost and accuracy for every model involved [R26], and links to the relevant TypeSafe docs page [R27].
- Users can skip or revisit any level. [R28]
- Across the path there are clear cases where Jev wins, where the LLM wins, and where plain code is best. Jev must visibly lose where it is weak. [R29]

### 6.2 The levels

| #   | Level                                      | What happens                                                                                                                                                                                                                       | The user learns                                      | Winner                          | Docs                                                               |
| --- | ------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------- | ------------------------------- | ------------------------------------------------------------------ |
| 1   | Speed Race [R30]                           | Jev and the LLM classify the same big batch of items (Choice) and race; counters show items done, time and cost.                                                                                                                   | Jev is built for fast, cheap judgments at scale.     | Jev (speed, cost)               | `/concepts/system-one`                                             |
| 2   | Write Me a Poem [R31]                      | Both are asked to write a short 4-line poem. The LLM writes one; Jev cannot, since it only returns typed answers.                                                                                                                  | Jev does not generate text; that is System Two work. | LLM                             | jaggedness#generation                                              |
| 3   | Count the Fruits / Which Date First? [R32] | Jev is asked to count fruits in a list and to say which of two dates is first, and struggles. The user then applies the fix: one Noul per item with the count done in code, and date parts extracted by Jev then compared in code. | Keep counting, math and dates in code.               | Code (with Jev as helper)       | jaggedness#math-and-numbers, `/cookbooks/date_extraction_cookbook` |
| 4   | How Sure Are You? [R33]                    | The user rates their own confidence on items, then sees Jev's confidence on the same items and how often each was right at each confidence level.                                                                                  | What calibrated confidence is and why it matters.    | Jev (calibration)               | `/confidence`                                                      |
| 5   | Break It Down [R34]                        | One broad question ("is this a good product review?") is split into small atomic questions, and the answers are combined in code with weights.                                                                                     | Atomic questions combined in code.                   | Jev plus code                   | `/patterns/composite-scoring`                                      |
| 6   | The Router [R35]                           | The user sorts task cards into Jev, LLM or Code (drag-and-drop, with keyboard and tap alternatives), then runs the pipeline and sees each tool's result.                                                                           | Picking the right tool for each job.                 | Depends on the card             | `/patterns/intent-routing`                                         |
| 7   | Spot the Phish [R36]                       | One email is checked for many phishing signals in a single Jev request; each signal lights up with its probability and a short explanation.                                                                                        | Asking many questions in one request.                | Jev                             | `/patterns/fan-out`                                                |
| 8   | Trick Jev [R37]                            | The user tries to fool Jev with wording. In Beginner mode they pick from recorded trick attempts; in Developer mode they write their own.                                                                                          | Literal reading and precise instructions.            | Varies; shows Jev can be fooled | jaggedness#literal-reading, jaggedness#adversarial-content         |

## 7. VS games [R38]

### 7.1 Rules for every game

- Jev and an LLM play the same job against each other while the user watches them compete.
- Each game is animated with characters, obstacles or motion, and each covers a different use case.
- Both racers move at their real latency: recorded latency in Beginner mode, live latency in Developer mode.
- A live scoreboard shows accuracy, time and cost for each racer.
- Opponent: in Beginner mode the user picks Haiku 4.5, Sonnet 5.5 or Opus 5.5. In Developer mode it is any model the user's LLM key can reach.
- Both racers get the same inputs and the same expected answer format. [R92]
- An LLM output that can't be parsed counts as a miss and is shown, not hidden. [R44]
- Every game ends with a Reveal-style summary: winner, why, numbers, and a TypeSafe docs link.
- All games are timed, so every finished run adds entries to the user's Leaderboard (section 10.5).

### 7.2 The games

| Game                   | Priority | Use case                          | How it plays                                                                                                                                                   | Expected lesson                                                        |
| ---------------------- | -------- | --------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| Guardrail Gauntlet     | P0       | LLM guardrails                    | Messages, some carrying prompt injections or harmful asks, rush at a gate. Jev and the LLM are bouncers deciding pass, review or block.                        | Jev screens fast and cheaply; the scoreboard shows catches and misses. |
| Needle Hunt            | P0       | Semantic search / re-ranking      | A long document; both must find the lines that answer a question. Jev scores every line in one call; the LLM reads the whole document.                         | Jev ranks many candidates at once, fast and cheaply.                   |
| Number Crunch Showdown | P0       | Knowing when not to use Jev       | A counting and arithmetic duel. Jev visibly falls over, the LLM does better, and plain code wins outright.                                                     | Keep math in code. Jev loses here on purpose.                          |
| Review Tug-of-War      | P0       | Rating at scale (Score)           | A stream of product reviews; each correct sentiment score pulls the rope toward that racer.                                                                    | Score questions are fast and consistent at volume.                     |
| Smart Home Dash        | P1       | Intent routing / function calling | Jev and the LLM are two robot runners in a house; voice commands pop up and each racer must route the command to the right device before the next one arrives. | Jev routes intents quickly.                                            |
| Twin Finder            | P1       | Entity matching                   | Two conveyor belts carry product cards from two shops; each pair must be stamped "same" or "different" before it falls off.                                    | Cost and speed at scale for pairwise judgments.                        |
| Confidence Catch       | P1       | Confidence-gated routing          | Answers fall like fruit and land in "act", "human review" or the bin, based on a confidence threshold the user drags.                                          | Jev's calibrated confidence makes safe automation possible.            |
| Citation Cop           | P1       | Citation checking                 | Claims with quotes zoom past a checkpoint; each racer flags citations the source doesn't support.                                                              | A close race that teaches trade-offs.                                  |

## 8. Arena [R39-R46]

- Users pick a preset task and see Jev and an LLM do it side by side. [R39]
- Presets work in Beginner mode with no keys. [R40]
- In Developer mode users can edit a preset's inputs, or write their own task, and run it live. [R41]
- In Developer mode users pick which LLM to compare against. [R42]
- Results show each model's answer, Jev's probabilities and confidence, latency and cost. [R43]
- If an LLM returns output that can't be parsed into the expected format, the raw output and a "couldn't parse" note are shown. [R44]
- Batch mode (P1) runs one task on many items and shows speed and cost at scale. [R45]
- Share (P0) [R46]:
  - Mechanics: the result is saved server-side as a read-only snapshot under an unguessable ID, and the link opens the shared result page.
  - Labels: Beginner mode shares keep their "Beginner mode" label; Developer mode shares are labelled "Developer mode, run by a user".
  - Consent: before a share containing the user's own text is created, the user confirms it will be public.
  - Abuse protection: size limits, a per-user rate limit, output shown only as plain text, pages not indexed by search engines, and the creator can delete their share. [R87]

## 9. Sandbox [R47-R54]

- Users write a state and add Choice, Score and Noul questions. [R47]
- Beginners use a simple form; advanced users edit raw JSON. The two views stay in sync. [R48]
- Ready-made templates, with recorded results, can be explored in Beginner mode without keys. [R49]
- Running custom questions requires Developer mode with the user's own Jev key (TypeSafe or OpenRouter). [R50]
- Answers, probabilities and confidence are shown visually (bars, gauges), not as raw JSON only. [R51]
- The Sandbox warns when a question matches a known Jev weakness: counting, math, dates, text generation, or very long input. [R52]
- Before sending, the input size is checked against Jev's limits (32k state plus longest question, 64k total, 255 options, 2-10 levels) and the send is blocked with a clear message if the input is over. [R53]
- Users can copy their setup as code (a ready-to-run request). [R54]

## 10. Accounts, quizzes and progress [R55-R64]

### 10.1 Sign-in [R55, R83]

- Email and password, with email confirmation turned off (so the site doesn't depend on sending email).
- The only personal information collected is the email address. [R83]

### 10.2 Quizzes [R56-R60]

- A "which tool fits?" quiz at the start of the path and a matching one at the end: 8 questions each, covering the same topics with different items. [R56]
- Quizzes are optional and never enforced. [R57]
- Users can see the solutions to every quiz. [R58]
- Every answer comes with a short explanation. [R60]
- Users who take both quizzes see how much their score improved from start to end. [R59]

### 10.3 Progress [R62]

Level status, quiz attempts, XP, badges and leaderboard entries are saved to the user's account and come back on any device.

### 10.4 XP, badges and completion card [R63]

- Users earn XP (for finishing levels, checks, quizzes and games) and badges (for milestones).
- Finishing the path gives a completion card.
- The exact XP values and badge list are defined in `DESIGN.md` (Step-3).

### 10.5 Leaderboard [R64]

- There is one leaderboard per user, and only for Jev and the LLMs, never for players.
- It ranks the results Jev and the LLMs achieved in the timed games (all VS games and Speed Race) that this user has run: accuracy, time and cost per model, per game, each entry labelled with its mode.
- A new user sees an empty state: "Begin playing and testing out Jev and LLMs to fill up this leaderboard here."
- Leaderboard entries store numbers and model IDs only, never task text.

## 11. Look and feel [R68-R74]

- Playful: animations, celebrations (for example confetti on a won prediction or a finished level), friendly wording. [R68]
- Light on text: diagrams, charts and pictures wherever feasible. [R69]
- Two themes [R70]:
  - **Dark**: inspired by GitHub's dark theme, a deep near-black (the owner asked for darker on 2026-10-02).
  - **Light**: inspired by Shopeedo, with a clearly cream background, near-white cards with soft shadows, and green/orange accents.
- The theme follows the device setting by default, and the user's choice is remembered. A theme choice is not a secret, so remembering it locally is allowed under Rule-8. [R71]
- Jev and the LLM each have one consistent color across the whole site, always paired with a label or icon. [R72]
- Works well on desktop and mobile; the UI scales with any screen or window size. [R73]
- All explanations are in plain English, with a glossary for technical terms. [R74]

## 12. Quality requirements

### 12.1 Scale and performance

- Serves at least 1,000 simultaneous users without errors or noticeable slowdown. [R75] This is achievable because Beginner mode is pre-recorded and Developer mode runs on users' own keys.
- Scale is verified with a load test before launch, run against the local production build, and the results are published on the Methodology page (P1). [R78]
- Pages load in under 2 seconds on a typical phone connection. [R79]

### 12.2 Security and privacy

- Analytics are anonymous and never include keys or user-entered task text. [R85]
- User-entered text and model outputs are always displayed as plain text, never run as code or HTML. [R86]
- Public content (shared links) is protected against abuse (section 8). [R87]

### 12.3 Accessibility

- Meets WCAG 2.1 AA in both themes. [R88]
- Everything, including drag-and-drop games, works with keyboard and touch. [R89]
- Color is never the only way information is shown. [R90]
- Animations respect the user's reduced-motion setting. [R91]

### 12.4 Honesty

- Comparisons use the same inputs and the same expected output format for both models. [R92]
- The method behind every comparison is described openly on the Methodology page, which needs sign-in like every page except shared results. [R93]
- Recorded results are never invented or edited. [R5]
- Items may be written or replaced to show a weakness TypeSafe documents (R29), and Methodology says so. The same items are never re-run to get a different result.
- Rule-5 (ROADMAP): no dummy data anywhere.

## 13. What we store and what we never store

| Stored (per signed-in user, unless noted)              | Never stored                                       |
| ------------------------------------------------------ | -------------------------------------------------- |
| Email and auth record                                  | Any API key (DB, logs, analytics, browser storage) |
| Level status, check answers, quiz attempts             | User task text in analytics                        |
| XP and badges                                          | Request bodies of TypeSafe pass-through calls      |
| Leaderboard entries (numbers and model IDs only)       | Personal data beyond email                         |
| Shared snapshots (only when the user chooses to share) |                                                    |
| Hashed counters for rate limits (a day at most)        |                                                    |
| Recordings (global, owner-created)                     |                                                    |
| Theme choice (in the browser)                          |                                                    |

## 14. Constraints [R94-R98]

- First built for the 8x Playmakers sprint (deadline 2026-10-03, submitted). It is now being made robust for a public launch to the TypeSafe Discord community (ROADMAP Rule-0.01); there is no deadline. [R94]
- Runs on localhost until ROADMAP Step-29 deploys it to Vercel at its free `vercel.app` URL; no custom domain is bought. The GitHub repo is the owner's personal repo. Every service is our own free account: Supabase (Postgres and Auth), Sentry and PostHog (`TECH-STACK.md`) (ROADMAP Rule-9). [R95]
- Jev accepts text only and performs best in English. [R96]
- Jev's rate and context limits apply to Developer mode Jev calls. [R97]
- AI coding-agent logs are kept in `.claude-logs/` during development (8x evaluates them). [R98]
- Total project spend stays within the remaining 10,000 PKR (ROADMAP Rule-0.3), and Anthropic spend within the $20 credit (Rule-0.1).
- Keys never go to browser storage (ROADMAP Rule-8).

## 15. Priorities

The Step-3 slice plan builds every P0 item before any P1 item.

| P0 (must ship)                                                             | P1 (ship if time allows)                                     |
| -------------------------------------------------------------------------- | ------------------------------------------------------------ |
| Sign-in, header, navigation, themes, Glossary, Methodology                 | Smart Home Dash, Twin Finder, Confidence Catch, Citation Cop |
| All 8 levels with the full loop and checks                                 | Arena batch mode [R45]                                       |
| Guardrail Gauntlet, Needle Hunt, Number Crunch Showdown, Review Tug-of-War | Published load-test results [R78]                            |
| Beginner mode recordings and replay, and the recording tool                |                                                              |
| Developer mode, the Keys screen, key safety                                |                                                              |
| Arena (presets, live runs, model picker, share links)                      |                                                              |
| Sandbox                                                                    |                                                              |
| Quizzes, progress, XP, badges, completion card, leaderboard                |                                                              |

## 16. Decisions made in Step-0.1 (2026-10-01)

- The owner has a TypeSafe (Jev) key and an Anthropic key for recording Beginner mode.
- VS games: the 8 in section 7, with the last four as P1.
- Sign-in is email and password with confirmation off.
- Share links are stored snapshots. The shared result page is the only page anyone can open without signing in, and it is read-only.
- The leaderboard is per user, for models only, never players.
- Keys live in memory only (Rule-8, added by the user this session).
- Developer mode accepts an OpenRouter key for Jev as well as a TypeSafe key, and OpenRouter as an LLM provider.
- Features are tiered P0/P1.

## 17. Open items for later steps

- Settled in Step-1 (`TECH-STACK.md`): password reset is out of v1, and Resend is added as Supabase's email sender at the Vercel launch; a full recording run is estimated at $5-10.
- Settled in Step-3 (`DESIGN.md`): content items and counts (sections 7-9), XP and badges (10), colors (13).
- Settled in Step-4: level 2 is "Write Me a Poem", so it doesn't clash with the Haiku 4.5 model name; the honesty rule for replaced items (12.4).
