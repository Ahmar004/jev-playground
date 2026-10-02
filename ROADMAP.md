# What we are building: 

### Name: Jev's Playground

A playground to learn System 1 models like Jev through games, experiements, quizzes built directly into the website, and it also lets the user let Jev and a frontier LLM do the same job (any game/task) directly on the website so user can learn where Jev breaks where Jev works tremendously well, so to grasp a stronger understanding on the use cases of System One models of Jev. We have to make the site really interactive, playful and so much interesting plus easier to navigate and awesome to spend time in.

Checkout @spec.md at root for the full product spec (it replaces docs/requirements.md, which stays as the verbatim brief).

Current Reamining Budget for this project: 7000 pkr


## Rules:

### Rule-A:
Do efficient utilization of tokens, to avoid hitting limits, without compromizing on the quality of the system we are shipping. we have to ship fast and solid stuff.
currently, 39% usage is done, and the 5 hour limit resets at 11:20, we need to ensure that we don't hit the limit by doing effective utlization of tokens.

### Rule-B:
Paid Anthrpoic API with 20 usd credits has been added in the .env.local, we have to make sure and ensure that we build the whole app without utilizing more than 20 usd, work in a way that we do all our work of recording for beginners and still the usage does not finish, so we don't have to buy more usage. Funds are limited...

### Rule-0:
This doc is not allowed to be edited without the approval user to maintain the well planned strategies that I had devised, feel free to ask questions and give proposals for any edits and then edit if approved by myself. Goal is just to make this app loved by millions across the globe one day I.A.

### Rule-0.1:
We have to stay within the current remaining budget for this project: 7000 pkr (about 25 usd, see the top of this doc), and Anthropic spend stays within the 20 usd credit (Rule-A). Only the GitHub repo is by 8x, rest all tools and apis are upon us to manage, we can utilize this payment for this project. Claude Code is already there, I have one week of Claude Code with me already. Lesser cost would be better for this project, unless it impacts the quality of the project (then we can even utilize all the remaining budget to make it as best as possible)

### Rule-0.2:
Ask questions from user with clarity, don't be brief when asking questions, otherwise user ends up understanding the qs in the wrong way.

### Rule-1:
We have to ship fast, Remaining days in deadline: 2

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
localhost only for now, build everything for shipping it as a robust system one day (I would probably deploy it at Vercel later on by pushing the project to a personal repo of mine, and then connecting that to a Vercel domain and deploying it from there), hackathon does not requires it, but I am planning to do it in future, to let the amazing app available to users across the globe.

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