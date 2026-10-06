# Jev's Playground

**Release Version 2.0** - see [Release 2.0](#release-20) for what this release shipped. Live at https://letsplaywithjev.vercel.app.

If you are looking to contribute, please have a look at [CONTRIBUTING.md](CONTRIBUTING.md).

An interactive website that teaches where System One models like Jev (TypeSafe's fast, typed-judgment model) work well, where they break, and where a frontier LLM or plain code is the better tool. You learn by playing: levels, games where Jev races an LLM, a side-by-side Arena, a hands-on Sandbox and quizzes.

It works with no setup at all. Beginner mode replays real recorded runs, so nobody needs an API key. Developer mode runs everything live with your own keys.

## Table of contents

- [What you can do](#what-you-can-do)
- [The two modes](#the-two-modes)
  - [What happens to your keys](#what-happens-to-your-keys)
- [How it works](#how-it-works)
- [Tech stack](#tech-stack)
- [Run it locally](#run-it-locally)
  - [Scripts](#scripts)
- [Numbers so far](#numbers-so-far)
- [Trade-offs](#trade-offs)
- [How AI was used to build it](#how-ai-was-used-to-build-it)
- [Docs](#docs)
- [Release 2.0](#release-20)

## What you can do

| Area      | What it is                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| --------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Path      | 8 levels, each with the same loop: Learn, Predict, Play, Reveal, Check. Speed Race, Write Me a Poem, Count the Fruits / Date First, How Sure Are You?, Break It Down, The Router, Spot the Phish, Trick Jev. None is locked.                                                                                                                                                                                                                                                                    |
| Games     | 14 animated races where Jev and an LLM do the same job at their real latency, each showing the question both get and every item with each racer's answer: Guardrail Gauntlet, Needle Hunt, Number Crunch Showdown, Review Tug-of-War, Smart Home Dash, Twin Finder, Confidence Catch, Citation Cop, and six arena games where you watch them play (Inbox Keeper, Headline Invaders, Severity Archery, Double-Negative Maze, Carnival Hoops, Date Defense) and can replay any item side by side. |
| Arena     | Preset tasks run side by side, with each model's answer, Jev's probabilities and confidence, latency and cost. Each preset shows its question and options first. Batch mode runs a whole task at once. Results can be shared as a read-only link.                                                                                                                                                                                                                                               |
| Sandbox   | Build a Jev state and its Noul, Choice and Score questions in a form or raw JSON. It warns about known Jev weaknesses, checks Jev's size limits before sending, and copies the setup as a curl or TypeScript request.                                                                                                                                                                                                                                                                           |
| Quizzes   | A start quiz and an end quiz, so you can see what you learned. Retry either one; the latest attempt counts.                                                                                                                                                                                                                                                                                                                                                                                     |
| Progress  | XP, badges, a completion card, and a personal Leaderboard of model runs.                                                                                                                                                                                                                                                                                                                                                                                                                        |
| Guide     | A short welcome tour for new accounts that ends on "Start here: Play level 1", plus one-time tips inside a level (such as opening "See every item" in Reveal). Replay it from the account menu or Home.                                                                                                                                                                                                                                                                                         |
| Reference | A Glossary, and a Methodology page that explains how every number was measured, including the load test.                                                                                                                                                                                                                                                                                                                                                                                        |

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

Beginner mode needs no model keys. The `TYPESAFE_API_KEY` and `ANTHROPIC_API_KEY` lines are for the owner's recording CLI only; leave them empty. `CONTRIBUTING.md` has the full setup, how to run the tests and the checks a pull request must pass.

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

- **Tests:** 851 Vitest and 114 `node:test` tests, plus 162 Playwright end-to-end tests that cover every user flow, including an accessibility audit (axe) of every page in both themes at desktop and phone width.
- **Recordings:** 37 tasks recorded for real. They cost $0.65 of Anthropic credit, and Jev cost under a cent in total.
- **Load (k6, local production build, one Node process on one PC, 2026-10-06):**
  - 400 simultaneous users: 0 failures, median 161 ms, p95 359 ms.
  - 1,000 simultaneous users: 0 failures, but a 5.6 s median, because one Node process runs out of CPU (about 99 requests a second). Vercel runs many instances, so this is not the live site's limit.

  Methodology publishes both runs.

## Trade-offs

- **Recordings instead of live calls for beginners.** Nobody needs a key, the owner's keys are never exposed to the public, and the site works when providers are down. The cost: Beginner mode only covers built-in content, and new content means a new paid recording run.
- **Sign-in before anything else.** Progress, XP and the Leaderboard need an account. Only shared result pages are public, and they are read-only and not indexed. Because every other page redirects signed-out visitors to sign-in, a link pasted into Discord shows the card from the sign-in page (name, tagline and a generated image), and `sitemap.xml` lists only that page.
- **A server hop for TypeSafe only.** TypeSafe does not allow browser calls, so its key passes through our server, which neither stores nor logs it. Every other provider is called directly from the browser.
- **No provider SDKs.** Hand-written `fetch` modules cost more code, but they give exact timing and payloads that match the real APIs.
- **Hand-built SVG charts and CSS animations** instead of a chart library, to keep client bundles small.
- **Known gaps:**
  - Prices are stored by hand from each provider's pricing page. A model not in `content/prices.json` shows "price unknown", and so does a promotional price after its last day, until someone checks the pages again.
  - There is no password reset yet: sending reset emails needs an email sender on a domain we own, and none is bought.
  - Lighthouse's simulated slow phone still puts the largest paint at 4.2 to 6.6 s (the real page paints in under 1 s on a normal connection). Getting the simulation under 2 s needs a smaller first JavaScript download.

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
| `docs/runbook.md`         | Running the live site: outages, key rotation, alerts.        |
| `CONTRIBUTING.md`         | How to contribute, run the app and test it locally.          |
| `AGENTS.md`, `CLAUDE.md`  | Engineering and project rules for the coding agent.          |

## Release 2.0

**In short:** Release 1.0 was the 8x hackathon submission (2026-10-03): the full app, running on one laptop. Release 2.0 puts it on the internet for everyone. It is live at a public address, safer, ready for a crowd, runs live with more model providers, and is easier and more fun to learn from: a guided first visit, the full context in every game, six new games with animated scenes, and quizzes you can retry. It covers ROADMAP Steps 9 to 45 (2026-10-04 to 2026-10-06).

### Live on the internet

- Deployed on Vercel at https://letsplaywithjev.vercel.app (free plan), with its server functions in Washington, D.C. (`iad1`), next to a separate production Supabase project in US East. Test accounts and dev data never mix with real players.
- Production errors go to their own Sentry project, and a PostHog funnel follows new players from opening the app to finishing a level.
- Links shared on Discord and elsewhere show a card with a title, a description and a generated image. `robots.txt` and `sitemap.xml` are built from the site's address.
- Database connections are sized for serverless: 5 per function instance, released when an instance is suspended, so a traffic spike does not exhaust Supabase's free connection pooler.
- `docs/runbook.md` says what to do when something breaks: the site is down, the database is paused, a key must be rotated, or the credit runs low.
- GitHub CI runs lint, types, formatting, the secrets scan, the unit tests and the build on every push.

### Safer

- Rate limits are stored in Postgres, so every server instance shares them: the TypeSafe pass-through (600 calls a minute per user, 1,200 per IP), sign-in (10 tries per email and 30 per IP in 15 minutes) and sign-up (20 per IP an hour). A limited request shows a clear message.
- Supabase Auth now counts its own sign-in limits per visitor instead of per Vercel server. Without this, everyone arriving at once would have shared one small limit and seen "Too many attempts" after about 30 sign-ups.
- A full security review: sign-in and ownership checks on every server action and route; a Content Security Policy that lets keys go only to the providers' own addresses; HSTS, no framing and a strict referrer policy; a dependency audit; and a recheck that no key can leak.
- "Delete my account" on Profile removes everything we store about you, including your sign-in. A Privacy page says what we store and what we never store.

### Developer mode, complete

- Every level now runs live with your keys, including level 6 (The Router) and level 8 (Trick Jev, where your own trick text goes to Jev).
- After a live run, Reveal shows your live numbers beside the recorded ones, each labelled with its mode, model and time.
- Jev also runs with an OpenRouter key, so a TypeSafe key is no longer required to run Jev live.
- OpenAI and Google models show a real cost: 57 prices from each provider's official pricing page, with the date they were checked.
- Checked with real keys on the live site for TypeSafe, Anthropic, Google and OpenRouter. A provider that hangs stops after 60 seconds with a clear message.
- The model pickers start on the cheapest priced model and hide models that cannot answer in text (image, audio, speech and agent models).

### Easier and more fun to learn

- A short welcome tour for new accounts ends on "Start here: Play level 1", with one-time tips inside a level.
- "Play next level" at the end of a level, and "Play next game" at the bottom of every game.
- Every game shows the exact question Jev and the LLM get, and every item with each racer's answer, so you can see why each one won or lost. The Arena does the same for its presets.
- Six new arena games where you watch Jev and the LLM play in an animated scene: Inbox Keeper, Headline Invaders, Severity Archery, Double-Negative Maze, Carnival Hoops and Date Defense. Every result is a real recording.
- The first eight games got their own animated scenes in place of moving chips.
- "VS" is gone from the names: they are just Games.
- Quizzes can be retried, and the latest attempt counts.
- The Sandbox form can now set Noul criteria and Choice option descriptions, which only the JSON view could set before.
- Reveal's "See every item" box says what it holds.

### Faster and accessible

- Pages that only show the header make 1 progress query instead of 3.
- On a simulated slow phone, Home's largest paint went from 6.9 s to 4.2 s: text no longer fades in, the error tracker loads once the page is idle, and an unused 33 KB survey script is gone.
- An accessibility audit (axe, WCAG 2.1 AA) of 38 pages and states, in light and dark, at desktop and phone width, reports 0 violations. Scrollable boxes can now be reached by keyboard.

### Tested

- Final testing on the live site found and fixed six bugs, among them Jev's answers shown as raw JSON in some levels, a missing Score label in the Arena, and times on shared results shown without a time zone.
- End-to-end tests sign in once and reuse the session, so a full run no longer trips Supabase's sign-in limit, and the dark-theme screenshots really show the dark theme.

### Known gaps

- No password reset yet (it needs an email sender on our own domain).
- No real-key check yet for OpenAI models (no key was available).
- Some promotional prices end on 2026-11-21 and 2026-12-31; those models show "price unknown" until the prices are rechecked.
- More launch hardening is the next step, ROADMAP Step-46: fewer server calls per page view, a "site updated" message after a deploy, and a lighter first load on phones.
