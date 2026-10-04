# What we are building: 

### Name: Jev's Playground

A playground to learn System 1 models like Jev through games, experiements, quizzes built directly into the website, and it also lets the user let Jev and a frontier LLM do the same job (any game/task) directly on the website so user can learn where Jev breaks where Jev works tremendously well, so to grasp a stronger understanding on the use cases of System One models of Jev. We have to make the site really interactive, playful and so much interesting plus easier to navigate and awesome to spend time in.

Checkout @spec.md at root for the full product spec (it replaces docs/requirements.md, which stays as the verbatim brief).

Current Reamining Budget for this project: 10,000 pkr
Current remaining Anthropic API credits: $19.47 USD
Current Usage of Jev: $0.0047 for 130, 831 tokens


## Rules:

### Rule-0.01:
We are now shipping this to the world, I would share this project once its solid enough into TypeSafe.ai's discord community which has about 100k+ people, I had already submitted the 8x hackathon version (before the deadline), now there's no such deadline, we have to make this system robust so that its fast, scalable, reliable, and secure.

### Rule-0.0:
Do efficient utilization of tokens, to avoid hitting limits, without compromizing on the quality of the system we are shipping. we have to ship fast and solid stuff. Efficient utilization does not mean neglecting important stuff, just consume tokens efficiently.

### Rule-0.1:
Paid Anthrpoic API with 20 usd credits has been added in the .env.local, we have to make sure and ensure that we build the whole app without utilizing more than 20 usd, work in a way that we do all our work of recording for beginners and still the usage does not finish, so we don't have to buy more usage. Funds are limited...

### Rule-0.2:
This doc is not allowed to be edited without the approval user to maintain the well planned strategies that I had devised, feel free to ask questions and give proposals for any edits and then edit if approved by myself. Goal is just to make this app loved by millions across the globe one day I.A.

### Rule-0.3:
We have to stay within the current remaining budget for this project: 10,000 pkr (see the top of this doc), and Anthropic spend stays within the 20 usd credit (Rule-0.1). The GitHub repo is now my personal repo, and all tools and apis are upon us to manage, we can utilize this payment for this project. Claude Code is already there, I have one week of Claude Code with me already. Lesser cost would be better for this project, unless it impacts the quality of the project (then we can even utilize all the remaining budget to make it as best as possible)

### Rule-0.4:
Ask questions from user with clarity, don't be brief when asking questions, otherwise user ends up understanding the qs in the wrong way.

### Rule-1:
We have to ship fast. The 8x hackathon deadline (2026-10-03) has passed, so there is no deadline now (Rule-0.01), but every step still ships fast and solid.

### Rule-2:
Maintain .claude-logs setup throughout the project.

### Rule-3:
Follow Claude.md as well, make sure @ROADMAP.md and @CLAUDE.md are on the same page and both are followed throughout the project.

### Rule-4:
A shift in the strategy/plan would mean that first you have to add that extra step or edit something here after user's approval, and only then you should proceed to work. This is for clarity, and so future sessions could understand the work done so far and the work remaining under roadmap.

### Rule-5:
No dummy data, everything shall be functional, treat is as a product that could be deployed later on for the world to explore.

### Rule-6:
Shorter and focused sessions: @docs/progress.md is for saving progress and sharing beneficial context for the next step under @ROADMAP.md, save progress there so that every step could be done in seperate sessions of Claude Code. Long sessions just consume more memory and quality weakens because context window gets larger and larger in longer sessions.

### Rule-7:
If you come across any other feasible rules that we shall add here to make the system more better, ask from me, and feel free to add here after approval.

### Rule-8:
Never store API keys/secrets in browser's local storage, local storage is highly vulnerable, even a small injection by a hacker can steal those keys.

### Rule-9:
localhost only until the Vercel deploy step (Step-29). This repo is now my personal repo, and the app will be hosted on Vercel at its free `vercel.app` URL; no custom domain is bought for now. Build everything so it runs on Vercel unchanged: no runtime file writes, no state in one process's memory, pooled database connections.

### Rule-10:
Write clear, step-by-step setup instructions for every API and external service used in this project under @docs/api-setup-guide.md: creating the account and project, the settings to change, and which values go into .env.local. Add a service's section in the same step that adds the service.

### Rule-11:
Use Claude-in-chrome extension for checking out anything on the localhost, if you want to double check/debug or verify anything.

<hr style="height:4px; background-color:Grey; border:none;">

## Steps:

### Step-0:
Agent capture setup (mandatory, from the 8x team): install Claude Code hooks that log every prompt and final response to .claude-logs/, verify with canary prompts in two sessions, write CAPTURE-TEST.md, commit & push .claude-logs/ as we go, together with the code. guide shared by 8x is placed at @/docs/agent-session-logs-setup.md

### Step-0.1:
Use /superpowers:brainstorming skill to analyze the requirements under @docs\requirements.md file, and create an accurate and precise spec.md file at root to save your in-depth understanding of this project, but spec.md file should still be detailed enough that we no longer have to look at @requirements.md under @/docs again.

### Step-0.2:
Analyse the currrent project in depth, its a template shared by 8x, for web projects. Based on the spec we created, cater all things we need to maintain from this template and what are things to be discarded, considering everything that this template has analyzing which things are to be kept and which to be discarded. This template has things that had helped so many web app projects in past, so we have to check each thing that this template delivers to us. We have to build on top of this template, but first discarding irrelevant things is needed. Ensure that all things that we need to maintain are incorporated at feasible places under @ROADMAP.md, @CLAUDE.md, TECH-STACK.md and spec.md. Take approval before editing these files and share exactly what you need to add, and ask open questions from user whenever needed, during this step. create a to-discard.md file at root which lists everything that is better to be discarded based on the @spec (based on the app we are building.) just add feasible things in TECH-Stack during this step, we are gonna decide the tech stack in a later step.

### Step-0.3:
Analyse the @CLAUDE.md in root and analyse if we need any changes in it based on @spec.md, @roadmap.md, the current few items at @TECH-STACK.md and @inspiration-Claude.md. @inspiration-Claude.md is only for inspiration, I had used it for the 24 hour assessment at 8x prior to this, and the project turned out really great and entered me into this hackathon where I am building Jev's Playground. Take inspiration from @inspiration-Claude.md, and make sure to add things from it which could be relevant, helpful for this project. Ask open-questions from user while doing this step and don't devide, assume anything by yourself.

### Step-0.4:
Discard the items under @to-discard.md with user's permission, and also delete the @inspiration-Claude.md. Also apply the follow-up edits listed under each group in @to-discard.md, so the app still builds and `pnpm check:standards` still passes. Once everything in it is removed, delete @to-discard.md too; git history keeps it, and @docs/progress.md summarises what was removed.

### Step-0.5:
double check that agents log are working, and we are good to go for step-1, and that ROADMAP.md, CLAUDE.md, spec.md are solid for this project.

### Step-1:
Use /superpowers:brainstorming writing-plans skill to append/edit the TECH-STACK.md file on the basis of @spec.md, @ROADMAP.md, @CLAUDE.md files to propose and approve the feasible tech stack for this app from me, also suggest the feasible web app rendering strategy that we should use after doing an anlysis ( example SSR/CSR/ISR/SSG or a mix of these if feasible) along with precise explanation for reasons to support your choice. The proposed tech stack shall cover the complete app: backend, frontend, database, every api. Don't make this doc too long, also summarize the tech stack in 4-5 lines at one place, where you just name the proposed componants e.g Next.js for Frontend, backend, Supabase for Db and so on. Please note that we have to make it as a local project for now, no deployment on vercel needed (as access is restricted as the github repo is owned by 8x). Wait for approval from my side before proceeding to step-2

### Step-2: 
Revisit the Claude.md & ROADMAP.md files and edit it for this project if there are any feasible additions based on the files: @spec.md, @TECH-STACK.md.

### Step-3: 
Use /superpowers:brainstorming writing-plans skill to edit/alter @DESIGN.md document for this app that has all the details of how each feature shall be built, it shall cover frontend + backend both. Create DESIGN.md doc on the basis of ROADMAP.md, CLAUDE.md, @spec.md, @TECH-STACK.md files. Please do not invent requirements by yourself, the design.md shall be a guide on how to build this app into a fully working system. The design.md shall also list the list of screens/pop-ups/tabs/flows that our web app shall have. It shall end with an ordered slice plan for building the whole app. Save it as DESIGN.md (Windows treats design.md and DESIGN.md as the same file), and fold in the template's design-token conventions from the current DESIGN.md.

### Step-4:
Use /superpowers:brainstorming skill to re-analyze @DESIGN.md, @spec.md, @tech-stack.md, ROADMAP.md & CLAUDE.md files  and validate that we are ready to build a solid app that is beneficial for beginners, really interactive and super cool to play with. Ask any open-questions from user related to confusions or conflicts in between the docs, and ensure that our next step could be starting the code implementation (meaning that the plan and design is solid and smooth, having no conflicts/confusion and no weaknesses)

### Step-5:
Foundation (git and GitHub already set up): scaffold the project, set up the database and external services under .env.local along with an env.example file, finish any other foundational work needed after approval from me. This includes renaming the template placeholders (package name, app title, .env.example header), creating the free Sentry and PostHog projects, and generating and applying the baseline Prisma migration plus the enable-RLS migration locally. Also apply the Step-5 items from TECH-STACK.md and docs/progress.md: upgrade Prisma to 7 (the pg driver adapter and `prisma.config.ts`), switch `proxy.ts` to `getClaims()`, add Vitest, turn on `cacheComponents`, and install the UI libraries TECH-STACK.md names.

### Step-6:
Use subagent-driven-development skill to build the app slice by slice in the order of the slice plan in Design.md, on the basis of Design.md, @spec.md and @tech-stack.md files. For every slice: write tests first (test-driven-development), build it, test it, then commit and push to gitHub before starting the next slice. Use Opus 5.5 for the main agent and Sonnet 5.5 for the subagents to avoid hitting token limits. Use maximum one agent under the sub agnts to avoid hitting token limits. GitHub CI is disabled, so run the local-review skill before every commit and push. It is the only gate.

### Step-7:
Hardening: use systematic-debugging skill and end-to-end tests for testing all workflows and functionalities to find and fix bugs across the whole system. Also run the k6 load test against the local production build and publish its results on the Methodology page (R78, P1).

### Step-8:
Write the README at root for submission: what is built, how to run it locally, the trade-offs made, and how AI was used to build it, and a talking-point outline for me for the Loom walkthrough video of this project at the end of the readme.

<hr style="height:4px; background-color:Grey; border:none;">

## Global launch phase (Rule-0.01)

### Step-9:
Docs and repo hygiene, no app code. Update the stale references in CLAUDE.md, spec.md, DESIGN.md, TECH-STACK.md and docs/rules/deployment.md: the $20 credit is "Rule-0.1", not "Rule-A"; the 2026-10-03 deadline is gone; "8x owns this repo, never deploy" is gone, because the repo is now the owner's; the budget matches the top of this doc. Stop tracking `.superpowers/` (the files stay on disk) and add it to `.gitignore`. The app behaves exactly the same afterwards.

### Step-10:
Shorter session starts, docs only. Add a "Current state" block (about 40 lines) at the top of docs/progress.md: what is built, what is open, the next step. Nothing below it is removed. Move the pitfalls scattered through progress.md into a short "Known pitfalls" section in CLAUDE.md.

### Step-11:
Level 6 in Developer mode (R14). With keys pasted, the router cards run live through the shared runner instead of showing recordings, labelled with the mode, model ID and run time. Tests first, plus an e2e test against intercepted providers. No Anthropic spend.

### Step-12:
Level 8 in Developer mode (R14). The user's own trick text runs live against Jev with their key; Jev's real answer is shown, and an unparseable reply counts as a miss (R44). Tests first, plus an e2e test against intercepted providers.

### Step-13:
Live results in Reveal. After a Developer mode run, Reveal shows the live run's numbers beside the recorded ones, each with its mode label, model ID and run time. Nothing new is saved.

### Step-14:
Prices for OpenAI and Google models. Add per-token prices from each provider's official pricing page to content/prices.json, with the date they were checked, so Developer mode shows a cost instead of "price unknown". Methodology names each price's source.

### Step-15:
Real-key check, part 1, with the owner at the PC: TypeSafe and Anthropic keys. Run one level live on localhost, check it through Claude-in-Chrome, and fix any response shape the faked tests missed. Costs cents of the credit (Rule-0.1).

### Step-16:
Real-key check, part 2: OpenAI, Google and OpenRouter (LLMs), only for the providers the owner has keys for. Note any skipped provider in progress.md.

### Step-17:
Jev through an OpenRouter key (spec 3.4). Send one real request, build the provider from the real response shape, then add tests and the Keys panel option like the other providers. Needs the owner's OpenRouter key.

### Step-18:
Sandbox form gaps. Add Form fields for Noul criteria and Choice option descriptions, which only the JSON view can set today, kept in sync with the JSON view.

### Step-19:
Rate limits in Postgres. Limit the `/api/jev` pass-through and sign-up/sign-in per user and per IP, with counters in a table (no in-memory state, so it works on Vercel). Shares already have a per-user daily limit. A limited request shows a clear toast. Tests first.

### Step-20:
Security review. Run the security-review skill over the whole app and fix the findings: auth and ownership guards on every Server Action and route, CSP and security headers (HSTS, Referrer-Policy, frame-ancestors), `pnpm audit`, and a key-leak recheck (Rule-8).

### Step-21:
Account self-service and privacy. "Delete my account" on Profile removes progress, attempts, XP, badges, shares and the Supabase Auth user, behind a confirm dialog. A Privacy page says what we store and never store (spec 13). Server-side ownership checks and an e2e test.

### Step-22:
GitHub CI. The repo is the owner's now, so add a free GitHub Actions workflow that runs lint, typecheck, format:check, check:secrets, the unit tests and the build on every push. local-review stays the gate before a commit.

### Step-23:
Stable e2e auth. Sign in once in a Playwright setup project and reuse the stored session, so a full run no longer trips Supabase's sign-in rate limit. Also fix the theme screenshots: set the theme key and wait for the rise-in animation, so both themes are actually proven.

### Step-24:
Fewer database calls per page (R75). Merge the header's 3+ progress queries into one, or reuse data the page already loads. Unit test plus a manual page-load check. No load test in this step.

### Step-25:
Rerun the local load test (R78). On an idle PC, run k6 at 400 and 1,000 users against a fresh build, replace the results on Methodology, and add one honest line on what a single Node process can serve.

### Step-26:
Accessibility audit (R88-R91). Run axe through Playwright on every page, in both themes, at desktop and phone width, and fix what it reports.

### Step-27:
Page-load check (R79, under 2 s on a phone). Run Lighthouse mobile on Home, one Level, one VS game, Arena and Sandbox from the production build. Fix the worst 2-3 causes and record before and after numbers.

### Step-28:
Production Supabase. Create a separate free Supabase project for production, apply the migrations, run db:run-once and check:rls against it. Email confirmation stays off: without a custom domain there is no email sender of our own, and Supabase's built-in sender allows only a few emails an hour; Step-19's rate limits guard sign-ups instead. Add the steps to docs/api-setup-guide.md.

### Step-29:
Vercel deploy on the free `vercel.app` URL (no custom domain). Import the repo into Vercel, set the env vars (`NEXT_PUBLIC_APP_URL` is the `vercel.app` URL, also added to Supabase's allowed redirect URLs), put the function region next to the database, and point Sentry and PostHog at production. Update CLAUDE.md "Local now, Vercel later" and docs/rules/deployment.md. Smoke-test every flow on the live URL through Claude-in-Chrome.

### Step-30:
Database connection pool for serverless. Each Vercel function instance opens its own pool of up to 40 connections (`POOL_MAX_CONNECTIONS` in `src/server/db/client.ts`, raised from 10 in Step-7 because one local process served every user). A few busy instances together could pass the free Supabase pooler's limit of about 200 clients, and new requests would then fail with "too many clients" during a Discord traffic spike. The real Postgres connections behind the pooler are few anyway, so a large pool per instance only uses up client slots faster. The fix is small and free:
- Read the pool size from an env var. Keep 40 locally and use about 5 on Vercel.
- Close idle connections quickly.
- Use Vercel's recommended helper (`attachDatabasePool` from `@vercel/functions`), so an instance releases its connections when it is suspended. That is a new package, so ask the owner before adding it.
- Step-24 (fewer queries per page) also helps, because each page holds a connection for less time.
No Supabase upgrade is needed for this. Upgrade to Pro ($25 a month, about 7,000 PKR) only if the Vercel load test (Step-32) or real launch traffic shows the database maxed out (pooler errors, CPU stuck at 100%).

### Step-31:
SEO and sharing basics for the `vercel.app` URL: page titles and descriptions, Open Graph images (so links shared on Discord show a card), `sitemap.xml` and `robots.txt` built from `NEXT_PUBLIC_APP_URL`. Shared result pages stay noindex (R87).

### Step-32:
Load test on Vercel. Run k6 against the live `vercel.app` URL, inside the free-tier limits, and publish the numbers on Methodology next to the local ones.

### Step-33:
Runbook and monitoring, docs plus config. Write docs/runbook.md: free Supabase projects pause after 7 days without activity and how to restore one, key rotation, what to do when the Anthropic credit runs low, and where Sentry alerts go. Set up Sentry alert rules and one PostHog funnel (posthog-funnel-builder skill).

### Step-34:
Richer scenes for the 4 P0 VS games (spec 7.2). Replace the chip animations with each game's own metaphor, built in Motion, reduced-motion safe, checked by screenshot in both themes at desktop and phone width.

### Step-35:
The same richer scenes for the 4 P1 VS games.

<hr style="height:4px; background-color:Grey; border:none;">
