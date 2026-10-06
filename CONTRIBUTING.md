# Contributing to Jev's Playground

**PRs that do not mention any issues, won't be considered. Please, first create an issue to highlight what you want to improve, and then send a PR, if you have a solution for it, thanks!**

Jev's Playground teaches where System One models like Jev work well, where they break, and where a frontier LLM or plain code is the better tool. Thank you for helping make it better. This guide covers how to propose a change, run the app and its tests on your machine, and what a pull request must pass.

## Table of contents

- [How to collaborate](#how-to-collaborate)
- [Run the app locally](#run-the-app-locally)
- [Test it locally](#test-it-locally)
- [Checks every pull request must pass](#checks-every-pull-request-must-pass)
- [Project rules that matter most](#project-rules-that-matter-most)
- [Commits and pull requests](#commits-and-pull-requests)
- [Reporting a security problem](#reporting-a-security-problem)

## How to collaborate

1. **Open an issue first.** Say what is wrong or missing, where you saw it (page, steps, browser, phone or desktop), and what you expected. For an idea, say what problem it solves for a learner. Search the open issues first, so the same thing isn't filed twice.
2. **Wait for a reply before building anything big.** The maintainer may already have a plan, or the change may conflict with the product spec (`spec.md`). A short "yes, go ahead" on the issue saves you wasted work.
3. **Fork, branch, build.** Make one focused change per pull request, with tests (see below).
4. **Open the pull request** and link the issue in its description (`Closes #123`).

Good places to start: anything a learner finds confusing, accessibility problems, wrong or unclear copy, and bugs with clear steps to reproduce.

## Run the app locally

You need:

- Node 22.18 or newer.
- A free Supabase project for sign-in and progress (https://supabase.com).
- Sentry and PostHog are optional locally; leave their lines empty.
- No model API keys. Beginner mode replays real recordings from `content/`, so the whole app works without any key.

Steps:

```bash
git clone https://github.com/<your-username>/jev-playground.git
cd jev-playground
corepack pnpm install                     # also generates the Prisma client and installs the git hooks
cp .env.example .env.local                # then fill it in, see below
corepack pnpm exec prisma migrate deploy  # creates the tables in your Supabase project
corepack pnpm db:run-once                 # one-off SQL, tracked so it never runs twice
corepack pnpm dev                         # http://localhost:3000
```

Fill in `.env.local` by following `docs/api-setup-guide.md`, section 1 (Supabase). It shows where each value is in the Supabase dashboard and which line it goes on. Two Supabase settings matter:

- **Authentication > Sign In / Providers > Confirm email: off.** The app expects a session right after sign-up, and the tests sign up throwaway `@example.com` accounts.
- **Data API: off**, as the guide says. All data goes through Prisma.

`src/lib/env.ts` checks every variable when the app starts, so a wrong value fails at once with a clear message. If `pnpm` is not on your PATH, keep the `corepack` prefix, as above.

Leave `TYPESAFE_API_KEY` and `ANTHROPIC_API_KEY` empty: they are only for the maintainer's recording command. To try Developer mode, paste your own keys into the Keys panel in the app. They stay in that tab's memory only.

## Test it locally

| What                    | Command                                       | Notes                                                                                                 |
| ----------------------- | --------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| Unit and component      | `corepack pnpm test`                          | The `node:test` suites, then Vitest. For Vitest alone: `corepack pnpm exec vitest` (watch mode).      |
| End-to-end (Playwright) | `corepack pnpm test:e2e`                      | Starts `pnpm dev` itself. Install the browser once: `corepack pnpm exec playwright install chromium`. |
| End-to-end on a build   | see below                                     | Closer to the live site, and more stable on Windows.                                                  |
| Lint, types, format     | `lint`, `typecheck`, `format:check`, `format` | `format` fixes formatting for you.                                                                    |

To run the end-to-end tests against a production build:

```bash
corepack pnpm build
corepack pnpm start                       # leave it running
E2E_BASE_URL=http://localhost:3000 corepack pnpm test:e2e
```

A few things that save time:

- The end-to-end tests sign up throwaway accounts in your Supabase project. Supabase limits sign-ins to about 30 per 5 minutes per IP, so if many tests suddenly fail on the sign-in page, wait a few minutes and run again.
- `pnpm start` serves the last build, so rebuild after a UI change.
- Run one file with `corepack pnpm test:e2e e2e/shell.spec.ts`, or one test with `-g "<part of its name>"`.

How we test:

- Write the test first for logic: the runner, parsing, scoring, cost math, key handling, API routes, server actions and hooks.
- Every user flow has a Playwright test. Change a flow, update or add its test.
- For a visual change, attach screenshots to the pull request in light and dark, at desktop and phone width.

## Checks every pull request must pass

GitHub CI runs these on every pull request; run them yourself first:

```bash
corepack pnpm lint            # ESLint, zero warnings allowed
corepack pnpm typecheck
corepack pnpm format:check
corepack pnpm check:env       # every env var is documented in .env.example and src/lib/env.ts
corepack pnpm check:secrets   # no keys or passwords in the code
corepack pnpm check:standards
corepack pnpm test
corepack pnpm build
```

The git hooks that `pnpm install` sets up also check each commit: the pre-commit hook scans the staged files for secrets, and the commit-msg hook checks the message format.

## Project rules that matter most

The full rules are in `AGENTS.md`, `CLAUDE.md` and `docs/rules/`. These are the ones a change most often breaks:

- **Keys never leave the tab's memory.** Never write an API key to local storage, session storage, cookies, IndexedDB, the database, logs, analytics, error reports or a URL.
- **Recordings are real.** Files under `content/recordings/` are real model outputs, written only by the maintainer's recording command. Never edit, invent or hand-tune them. If your change needs new recordings, say so in the issue: recording costs money, so the maintainer runs it.
- **Model output and user text render as plain text,** never as HTML (no `dangerouslySetInnerHTML`).
- **A model reply that can't be parsed counts as a miss** and is shown, never hidden.
- **Views don't compute scores or costs.** The shared runner in `src/runner/` does, for both recordings and live runs.
- **Database access goes through Prisma only.** Never hand-write a file under `prisma/schema/migrations/`. Change the schema in `prisma/schema/`, then generate the migration as `docs/rules/migrations.md` describes.
- **No new libraries without asking** in the issue first. `TECH-STACK.md` lists what we use and why.
- **Accessibility:** labelled inputs, visible focus, keyboard and touch alternatives to drag-and-drop, color never the only signal, and animations that respect reduced motion (WCAG 2.1 AA in both themes).
- **UI building blocks:** design tokens from `src/app/globals.css` and components from `src/components/ui/`. Icons come only from `@/components/ui/icons`.
- **Writing style,** in code, UI text, commits and docs: no emojis, and a plain hyphen "-" instead of long dashes. Use the product's words from `spec.md` section 1.2 (Jev, LLM, Code, Level, Game, Arena, Sandbox and so on).

## Commits and pull requests

- Use Conventional Commits: `type(scope): summary`, for example `fix(games): show every item in Needle Hunt`. Common types are `feat`, `fix`, `docs`, `test`, `refactor` and `chore`. `docs/rules/commits.md` has the details.
- Keep a pull request to one change. Small pull requests get reviewed sooner.
- In the description, say what changed and why, link the issue (`Closes #123`), say how you tested it, and add screenshots for anything visual.
- Never commit `.env.local` or any other secret.

## Reporting a security problem

Don't describe a security problem in a public issue. Open an issue that only says you found a security problem and how to reach you, with no details. The maintainer will contact you and fix it before anything is made public.
