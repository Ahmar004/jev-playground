# Jev's Playground

An interactive website that teaches where System One models like Jev (TypeSafe's fast, typed-judgment model) work well, where they break, and where a frontier LLM or plain code is the better tool. You learn by playing: levels, games where Jev races an LLM, a side-by-side Arena, a hands-on Sandbox and quizzes.

It works with no setup at all. Beginner mode replays real recorded runs, so nobody needs an API key. Developer mode runs everything live with your own keys.

## What you can do

| Area      | What it is                                                                                                                                                                                                                                                                                         |
| --------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Path      | 8 levels, each with the same loop: Learn, Predict, Play, Reveal, Check. Speed Race, Write Me a Poem, Count the Fruits / Date First, How Sure Are You?, Break It Down, The Router, Spot the Phish, Trick Jev. None is locked.                                                                       |
| Games     | 8 animated races where Jev and an LLM do the same job at their real latency, each showing the question both get and every item with each racer's answer: Guardrail Gauntlet, Needle Hunt, Number Crunch Showdown, Review Tug-of-War, Smart Home Dash, Twin Finder, Confidence Catch, Citation Cop. |
| Arena     | Preset tasks run side by side, with each model's answer, Jev's probabilities and confidence, latency and cost. Each preset shows its question and options first. Batch mode runs a whole task at once. Results can be shared as a read-only link.                                                  |
| Sandbox   | Build a Jev state and its Noul, Choice and Score questions in a form or raw JSON. It warns about known Jev weaknesses, checks Jev's size limits before sending, and copies the setup as a curl or TypeScript request.                                                                              |
| Quizzes   | A start quiz and an end quiz, so you can see what you learned. Retry either one; the latest attempt counts.                                                                                                                                                                                        |
| Progress  | XP, badges, a completion card, and a personal Leaderboard of model runs.                                                                                                                                                                                                                           |
| Guide     | A short welcome tour for new accounts that ends on "Start here: Play level 1", plus one-time tips inside a level (such as opening "See every item" in Reveal). Replay it from the account menu or Home.                                                                                            |
| Reference | A Glossary, and a Methodology page that explains how every number was measured, including the load test.                                                                                                                                                                                           |

The path is honest about Jev: it wins on speed and cost for fast judgments at scale, it visibly loses on text generation, counting, math and dates, and some lessons show plain code winning outright.

## The two modes

- **Beginner mode** replays real Recordings made with the owner's keys: Jev, plus Claude Haiku 4.5, Sonnet 5.5 and Opus 5.5. Replays animate at the recorded latency, and every result shows its mode, model ID and recording date. Recordings are real outputs, never invented or edited. Beginner mode reads only versioned JSON in `content/`, so it keeps working when every model API is down.
- **Developer mode** runs live calls with your own keys: Jev via a TypeSafe key or an OpenRouter key, and LLMs via Anthropic, OpenAI, Google or OpenRouter. With an LLM key you pick from the models that key can reach.

### What happens to your keys

- Keys live only in the tab's memory and disappear when the tab closes. They are never written to local storage, session storage, cookies, IndexedDB, the database, logs, analytics or error reports.
- Anthropic, OpenAI, Google and OpenRouter calls go straight from your browser to the provider. Google keys go in a header, never the URL.
- TypeSafe calls go through one server pass-through (`/api/jev`), because TypeSafe's API does not accept browser calls. It forwards the request and stores or logs neither the key nor the body.
- The Keys screen says all of this per provider and links to each provider's key page so you can revoke a key.

## How it works

```
content/tasks/*.json ----> runner (src/runner/) ----> RunEvents ----> useRace() ----> pure views
                             ^              ^
      pnpm record (CLI) -----'              '---- browser, Developer mode (your keys)
content/recordings/<task>/<model>.json ----> replay ----> the same RunEvents (Beginner mode)
```

Anything that runs a model is a Task: a content file of items, each with its correct answer. One runner turns a Task into results. It is used both by the owner's recording CLI and by Developer mode in the browser, so recorded and live numbers come from the same provider calls, parsing, scoring and cost code. Views never compute a score or a cost; they display the runner's numbers. An LLM reply that can't be parsed counts as a miss and is shown.

Provider calls use plain `fetch` plus Zod, one module per provider, and no SDKs. That way exactly one request is timed, with no hidden retries, and the latency stays honest.

## Tech stack

- **App:** Next.js 16 App Router (React 19, TypeScript strict, React Compiler, Cache Components). Content pages are prerendered; per-user data streams in under Suspense.
- **Data and auth:** Supabase Postgres and Auth. All data access goes through Prisma 7. Row Level Security is on with no policies, and the Supabase Data API is off.
- **UI:** Tailwind v4 design tokens, Radix, Motion, dnd-kit (with keyboard and tap alternatives), hand-built SVG charts, next-themes for light and dark.
- **Quality and ops:** Vitest, Playwright, k6, Sentry, PostHog and Pino.

`TECH-STACK.md` explains each choice.

## Run it locally

You need Node 22.18 or newer, and a free Supabase project for sign-in and progress. Sentry and PostHog are optional locally.

```bash
corepack pnpm install                 # also generates the Prisma client and installs the commit-msg hook
cp .env.example .env.local            # then fill it in, see below
corepack pnpm exec prisma migrate deploy
corepack pnpm db:run-once
corepack pnpm dev                     # http://localhost:3000
```

`docs/api-setup-guide.md` walks through creating the Supabase, Sentry and PostHog projects, and says which value goes on which `.env.local` line. `src/lib/env.ts` validates every variable at boot, so a bad value fails at once with a clear message. On machines where `pnpm` is not on PATH, prefix every script with `corepack`, as above.

Beginner mode needs no model keys. The `TYPESAFE_API_KEY` and `ANTHROPIC_API_KEY` lines are for the owner's recording CLI only; leave them empty.

### Scripts

| Script                                      | What it does                                                                                           |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `dev` / `build` / `start`                   | Dev server; production build; serve the build.                                                         |
| `lint` / `typecheck` / `format:check`       | ESLint with zero warnings; `tsc --noEmit`; Prettier.                                                   |
| `test` / `test:e2e`                         | `node:test` suites then Vitest; Playwright end-to-end tests.                                           |
| `check:env` / `check:secrets` / `check:rls` | Env vars documented; no secrets in source or session logs; RLS on with no policies.                    |
| `record`                                    | Owner only: record Jev and the Claude models for changed tasks. Costs money, so run `--dry-run` first. |
| `load:session` / `load`                     | k6 load test against `start`. See `docs/load-test.md`.                                                 |

## Numbers so far

- **Tests:** 619 Vitest and 114 `node:test` tests, plus 72 Playwright end-to-end tests that cover every user flow.
- **Recordings:** 31 tasks recorded for real. They cost $0.49 of Anthropic credit, and Jev cost under a cent in total.
- **Load (k6, local production build, one Node process on one PC):**
  - 400 simultaneous users: 0 failures, median 266 ms, p95 703 ms.
  - 1,000 simultaneous users: 0 failures, but a 6.2 s median, because one Node process runs out of CPU.

  Methodology publishes both runs.

## Trade-offs

- **Recordings instead of live calls for beginners.** Nobody needs a key, the owner's keys are never exposed to the public, and the site works when providers are down. The cost: Beginner mode only covers built-in content, and new content means a new paid recording run.
- **Sign-in before anything else.** Progress, XP and the Leaderboard need an account. Only shared result pages are public, and they are read-only and not indexed. Because every other page redirects signed-out visitors to sign-in, a link pasted into Discord shows the card from the sign-in page (name, tagline and a generated image), and `sitemap.xml` lists only that page.
- **A server hop for TypeSafe only.** TypeSafe does not allow browser calls, so its key passes through our server, which neither stores nor logs it. Every other provider is called directly from the browser.
- **No provider SDKs.** Hand-written `fetch` modules cost more code, but they give exact timing and payloads that match the real APIs.
- **Hand-built SVG charts and CSS animations** instead of a chart library, to keep client bundles small.
- **Known gaps:**
  - Prices are stored by hand from each provider's pricing page. A model not in `content/prices.json` shows "price unknown", and so does a promotional price after its last day, until someone checks the pages again.
  - There is no password reset yet.

## How AI was used to build it

The whole project was built with Claude Code, with one human owner making every product decision.

- **Docs first.** The verbatim brief (`docs/requirements.md`) became `spec.md`, with every requirement tagged `[R#]`. `TECH-STACK.md` and `DESIGN.md` followed. Each was proposed by the agent and approved by the owner before any code.
- **Plan and progress.** `ROADMAP.md` sets the order of work, and `docs/progress.md` holds the hand-off between short, one-step sessions, which keeps each session's context small.
- **Build.** The app was built in 14 slices, tests first, with Opus as the main agent and at most one Sonnet subagent at a time. A local review gate ran lint, types, tests, the build and end-to-end tests before every commit.
- **Content.** Some content (quiz questions, some task items) was written by Claude and spot-checked by the owner. Every model result is a real Recording, never AI-written.
- **Session logs.** Every prompt and final reply is captured by Claude Code hooks into `.claude-logs/` and committed with the code it produced (`CAPTURE-TEST.md`).

## Docs

| File                      | Answers                                                      |
| ------------------------- | ------------------------------------------------------------ |
| `spec.md`                 | What the product does, with requirement tags.                |
| `TECH-STACK.md`           | What it is built with, and why.                              |
| `DESIGN.md`               | How each feature is built, the screens and the slice plan.   |
| `ROADMAP.md`              | The order of work and the project rules.                     |
| `docs/progress.md`        | What is done, and the hand-off to the next step.             |
| `docs/api-setup-guide.md` | Setting up Supabase, Sentry, PostHog and the recording keys. |
| `docs/load-test.md`       | Running the k6 load test.                                    |
| `AGENTS.md`, `CLAUDE.md`  | Engineering and project rules for the coding agent.          |
