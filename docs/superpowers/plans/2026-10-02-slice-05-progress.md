# Slice 5: Progress Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Save each user's level progress, predictions, Check answers, XP and badges in Postgres, add the Check step, and build Home, Path and the header progress bar, so flows 1 and 2 (DESIGN 15) pass and a replay never awards XP twice.

**Architecture:** Pure decision functions (prediction verdict, completion rule, badge rule, status transitions) are tested in isolation. Thin Server Actions (`validatedAction` + `requireUser`) run them inside one Prisma transaction, write XP through a unique key so a repeat is a no-op, and call `refresh()` from `next/cache` so server-rendered progress (header bar, Path, Home) updates at once. Per-user reads are never cached and render inside `<Suspense>`. The client calls actions through TanStack Query mutations with optimistic updates, rollback and toasts.

**Tech Stack:** Next.js 16 (Cache Components on), React 19, Prisma 7 (pg adapter), Supabase Auth via `getSession`, TanStack Query 5, Vitest + Testing Library, Playwright.

**Spec:** `DESIGN.md` sections 6, 7, 10, 11, 14, 15, 16 (slice 5); `spec.md` 5.1-5.3, 6.1, 10.3-10.4. User decisions for this slice are at the bottom of `docs/progress.md` ("slice 5: Progress").

## Global Constraints

- Run every script as `corepack pnpm <script>`; Vitest alone is `corepack pnpm exec vitest run <path>`.
- No emojis, no long dashes (use "-"), spec vocabulary (Jev, LLM, Code, Level, Recording, Beginner mode...).
- Every enum-like value lives in `src/lib/constants.ts`; every route in `src/lib/links.ts`. No inline literals for statuses, XP sources, badge ids or step names.
- Database access only through Prisma, only in `src/server/actions/`, `src/server/data/`, `src/server/awards/`. Pages and components never import `@/server/db/client`.
- Every action except `signIn`/`signUp` calls `requireUser()` first and scopes every query by `session.userId`, never a client-given user id.
- The server never trusts a client-computed result: Check answers are scored against the content JSON; predictions are judged on the server from the recording files (`src/content/recordings.ts`, server-only).
- XP rows are unique on (userId, source, sourceId). Writes use `createMany({ skipDuplicates: true })` and read `count` to know whether the award is new.
- Per-user reads are not inside `'use cache'`; they render in a component wrapped in `<Suspense>` with a skeleton. After a progress write, the action calls `refresh()` from `next/cache` (Next 16 docs: `node_modules/next/dist/docs/01-app/03-api-reference/04-functions/refresh.md`).
- Components stay pure (props in, callbacks out). Mutations, timers and analytics live in hooks.
- User text and content render as plain text; no `dangerouslySetInnerHTML`.
- Icons only from `@/components/ui/icons`. Tokens only from `src/app/globals.css` (no hex, no arbitrary values).
- Forms: real `<form onSubmit>` with `event.preventDefault()`, `type="submit"` on the primary button, `type="button"` on others.
- Status is never color alone: always text (and optionally an icon).
- Tests: Vitest files are `*.test.ts(x)` next to the code. Server-only modules are testable because Vitest aliases `server-only` to `vitest.server-only.ts`.
- Commit after each task with a Conventional Commits message (header at most 72 characters), ending with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Commit straight to `main` (user decision), do not push.

## User decisions (binding)

1. A level's prediction is **correct** when every pick with a clear winner (`right` or `wrong` outcome) is right and at least one pick is right. `tie`, `unknown` and `skipped` outcomes are ignored.
2. Picks are saved on the server at Lock in (reload keeps them). The **first Reveal** is judged on the server against the opponent raced and is final (`revealedAt`, `predictionCorrect`, `opponentModelId` set once). Later Reveals still show right or wrong but change nothing. Confetti fires only on that first Reveal when it was correct.
3. Check: the **first answer** to each question is stored and decides the XP. The user then sees right or wrong, the right answer and the explanation, and may try again for learning (local state only, no XP). Revisits show the stored answers.
4. Path and the header bar count **built levels only**: "n of LEVELS.size". The `pathfinder` badge still needs all 8 levels (`LEVEL_COUNT = 8`), so it can't be earned before slice 7.
5. Level 1's 2 Check questions are approved verbatim (Task 1 has the JSON).

## File structure

| File                                                                                                       | Responsibility                                                                                           |
| ---------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| `src/lib/constants.ts` (modify)                                                                            | `LEVEL_STEPS.check`, `LEVEL_COUNT`, `XP_SOURCES`, `XP_AMOUNTS`, `BADGES`, `BADGE_LABELS`.                |
| `src/lib/links.ts` (modify)                                                                                | `ROUTES.path`.                                                                                           |
| `src/content/level-schema.ts` (modify)                                                                     | `check` block.                                                                                           |
| `src/content/levels.ts` (modify)                                                                           | Check question ids unique across levels; `getCheckQuestion`.                                             |
| `content/levels/speed-race.json` (modify)                                                                  | Level 1's Check questions.                                                                               |
| `src/content/testing/levels.ts` (modify)                                                                   | Test level gets a `check` block.                                                                         |
| `src/features/levels/judge.ts` (modify)                                                                    | `isPredictionCorrect(verdicts)`, `judgeAll(...)`.                                                        |
| `src/server/progress/rules.ts` (create)                                                                    | Pure: `nextStatusOnActivity`, `canSkip`, `isLevelComplete`, `earnedBadges`.                              |
| `prisma/schema/progress.prisma` (create)                                                                   | `LevelProgress`, `CheckAnswer`, `XpEvent`, `UserBadge`.                                                  |
| `prisma/schema/example.prisma` (modify)                                                                    | Back-relations on `User`.                                                                                |
| `prisma/schema/migrations/<ts>_progress/` (generated) and `<ts>_progress_rls/` (hand-written RLS only)     |                                                                                                          |
| `src/server/awards/awards.ts` (create)                                                                     | `awardXp(tx, ...)`, `syncBadges(tx, userId)`.                                                            |
| `src/server/actions/progress.ts` (create)                                                                  | `setLevelStatus`, `submitPrediction`, `revealPrediction`, `submitCheck`.                                 |
| `src/server/data/progress.ts` (create)                                                                     | `getProgressSummary(userId)`, `getLevelProgress(userId, levelId)`.                                       |
| `src/lib/analytics/events.ts` (modify)                                                                     | `level_started`, `level_completed`, `prediction_made`.                                                   |
| `src/features/levels/use-level-progress.ts` (create)                                                       | Mutations, optimistic state, toasts, analytics for one level.                                            |
| `src/features/levels/check-step.tsx` (create)                                                              | The Check step view.                                                                                     |
| `src/features/levels/level-stepper.tsx`, `reveal-step.tsx`, `predict-step.tsx`, `stepper-nav.tsx` (modify) | Wire progress, Check step, first-reveal confetti.                                                        |
| `src/app/(app)/levels/[levelId]/page.tsx` (modify)                                                         | Load the user's level progress under `<Suspense>`.                                                       |
| `src/features/progress/` (create)                                                                          | `level-status-label.tsx`, `path-view.tsx`, `use-skip-level.ts`, `progress-bar.tsx`, `home-progress.tsx`. |
| `src/app/(app)/path/page.tsx` (create), `src/app/(app)/page.tsx` (modify)                                  | Path and Home.                                                                                           |
| `src/features/shell/site-header.tsx` (modify)                                                              | Path link and the progress bar.                                                                          |
| `e2e/progress.spec.ts` (create), `e2e/level-1.spec.ts` (modify)                                            | Flows 1 and 2, screenshots.                                                                              |
| `DESIGN.md` (modify)                                                                                       | 11.3: `revealPrediction` and `refresh()`; 11.1: new LevelProgress fields.                                |

---

### Task 1: Content, constants and pure rules

**Files:**

- Modify: `src/lib/constants.ts`, `src/lib/links.ts`, `src/content/level-schema.ts`, `src/content/levels.ts`, `content/levels/speed-race.json`, `src/content/testing/levels.ts`, `src/features/levels/judge.ts`
- Create: `src/server/progress/rules.ts`
- Test: `src/content/level-schema.test.ts`, `src/content/levels.test.ts`, `src/features/levels/judge.test.ts`, `src/server/progress/rules.test.ts`

**Interfaces:**

- Produces (exact names later tasks use):
  - `LEVEL_STEPS.check = 'check'`, appended last in `LEVEL_STEP_ORDER`.
  - `LEVEL_COUNT = 8` exported from constants (and `level-schema.ts` imports it instead of its local copy).
  - `XP_SOURCES = { levelDone: 'level_done', checkCorrect: 'check_correct', predictionCorrect: 'prediction_correct', gameDone: 'game_done', quizCorrect: 'quiz_correct', arenaPreset: 'arena_preset', devFirstRun: 'dev_first_run' }`, type `XpSource`.
  - `XP_AMOUNTS: Record<XpSource, number>` = level_done 100, check_correct 20, prediction_correct 25, game_done 50, quiz_correct 10, arena_preset 10, dev_first_run 50.
  - `BADGES = { firstRace: 'first_race', pathfinder: 'pathfinder', rightTool: 'right_tool', phishSpotter: 'phish_spotter', trickster: 'trickster', gamer: 'gamer', oracle: 'oracle', quizClimber: 'quiz_climber', liveWire: 'live_wire', sharer: 'sharer' }`, type `BadgeId`.
  - `BADGE_LABELS: Record<BadgeId, { name: string; description: string }>` (names: First Race, Pathfinder, Right Tool, Phish Spotter, Trickster, Gamer, Oracle, Quiz Climber, Live Wire, Sharer; descriptions from DESIGN 10, e.g. "Finish level 1.").
  - `FIRST_LEVEL_ID = 'speed-race'` and `ORACLE_PREDICTIONS = 5` in constants.
  - `ROUTES.path = '/path'`.
  - `Level['check']`: `{ questions: { id: string; prompt: string; options: { id: string; text: string }[]; answerId: string; explanation: string }[] }`.
  - `getCheckQuestion(questionId): { level: Level; question: CheckQuestion } | undefined` and type `CheckQuestion` from `src/content/levels.ts` / `level-schema.ts`.
  - `isPredictionCorrect(verdicts: Verdict[]): boolean` and `judgeAll(level: Level, prediction: Prediction, jev: RunTotals, opponent: RunTotals): Verdict[]` in `judge.ts`.
  - `rules.ts`: `nextStatusOnActivity(current: LevelStatus | null): LevelStatus`, `canSkip(current: LevelStatus | null): boolean`, `isLevelComplete(input: { revealed: boolean; answeredQuestionIds: ReadonlySet<string>; level: Level }): boolean`, `earnedBadges(stats: BadgeStats): BadgeId[]` with `type BadgeStats = { doneLevelIds: ReadonlySet<string>; correctPredictions: number }`.

- [ ] **Step 1: Write failing tests.**
  - `level-schema.test.ts`: a level without `check` fails; `check.questions` must have 1 or 2 entries; each question needs 2-4 options with unique option ids; `answerId` must be one of its option ids (refine, message "answerId must name an option"); question ids match `/^[a-z0-9-]+$/`.
  - `levels.test.ts`: `buildLevelMap` throws `Duplicate check question id: <id>` when two levels share a question id; `getCheckQuestion('speed-race-tool-fit')` returns level `speed-race`; unknown id returns `undefined`.
  - `judge.test.ts` for `isPredictionCorrect`:
    ```ts
    const v = (outcome: PredictionOutcome) => ({
    	metric: PREDICTION_METRICS.fastest,
    	predicted: null,
    	winners: null,
    	outcome
    })
    expect(isPredictionCorrect([v('right'), v('right'), v('tie')])).toBe(true)
    expect(isPredictionCorrect([v('right'), v('wrong')])).toBe(false)
    expect(isPredictionCorrect([v('tie'), v('unknown')])).toBe(false) // nothing right
    expect(isPredictionCorrect([v('skipped'), v('skipped')])).toBe(false)
    expect(isPredictionCorrect([v('right'), v('skipped')])).toBe(true)
    expect(isPredictionCorrect([])).toBe(false)
    ```
    (Use the `PREDICTION_OUTCOMES` constants, not literals, in the real test.) And `judgeAll` returns one verdict per `level.predict.questions` entry in order, using `judgePrediction` with contenders `[{ racer: 'jev', totals: jev }, { racer: 'llm', totals: opponent }]`.
  - `rules.test.ts`:
    - `nextStatusOnActivity(null)` and `(skipped)` -> `in_progress`; `(in_progress)` -> `in_progress`; `(done)` -> `done` (never downgraded).
    - `canSkip(null)`, `(in_progress)` true; `(skipped)`, `(done)` false.
    - `isLevelComplete`: false when not revealed; false when one of 2 questions answered; true when revealed and every question id of `level.check.questions` is in the set.
    - `earnedBadges`: `{ doneLevelIds: {'speed-race'}, correctPredictions: 0 }` -> `['first_race']`; 5 correct predictions -> includes `oracle`; 4 -> no `oracle`; 8 distinct done ids -> includes `pathfinder`; 7 -> not. Order follows `BADGES` declaration order.
- [ ] **Step 2: Run** `corepack pnpm exec vitest run src/content src/features/levels/judge.test.ts src/server/progress` and confirm the new tests fail.
- [ ] **Step 3: Implement.**
  - `level-schema.ts` adds (replace the "Slice 5 adds check." comment):
    ```ts
    const slug = z.string().regex(/^[a-z0-9-]+$/)
    const MIN_CHECK_OPTIONS = 2
    const MAX_CHECK_OPTIONS = 4
    const MAX_CHECK_QUESTIONS = 2
    export const checkQuestionSchema = z
    	.strictObject({
    		id: slug,
    		prompt: text,
    		options: z
    			.array(z.strictObject({ id: slug, text }))
    			.min(MIN_CHECK_OPTIONS)
    			.max(MAX_CHECK_OPTIONS)
    			.refine(
    				(options) => new Set(options.map((o) => o.id)).size === options.length,
    				'Option ids are unique'
    			),
    		answerId: slug,
    		explanation: text
    	})
    	.refine((q) => q.options.some((o) => o.id === q.answerId), 'answerId must name an option')
    export type CheckQuestion = z.infer<typeof checkQuestionSchema>
    // in levelSchema, after docs:
    check: z.strictObject({
    	questions: z.array(checkQuestionSchema).min(1).max(MAX_CHECK_QUESTIONS)
    })
    ```
  - `levels.ts`: in `buildLevelMap`, track a `Set` of question ids and throw `Duplicate check question id: ${id}`. Add:
    ```ts
    export function getCheckQuestion(
    	questionId: string
    ): { level: Level; question: CheckQuestion } | undefined {
    	for (const level of LEVELS.values()) {
    		const question = level.check.questions.find((entry) => entry.id === questionId)
    		if (question) return { level, question }
    	}
    	return undefined
    }
    ```
  - `content/levels/speed-race.json`: add after `docs` (approved text, verbatim):
    ```json
    "check": {
    	"questions": [
    		{
    			"id": "speed-race-tool-fit",
    			"prompt": "Your shop gets 50,000 support tickets a day, and each one needs one of five teams. Which tool fits this job best?",
    			"options": [
    				{ "id": "jev", "text": "Jev: one typed Choice per ticket, fast and cheap at scale" },
    				{ "id": "llm", "text": "An LLM: it writes a reasoned answer for every ticket" },
    				{ "id": "code", "text": "Plain Code: keyword rules always pick the right team" }
    			],
    			"answerId": "jev",
    			"explanation": "Routing a ticket is one quick judgment repeated many times. Jev answers each with a typed Choice, so it is fast and pays only for the tokens it reads. Keyword rules break on wording they don't expect."
    		},
    		{
    			"id": "speed-race-llm-cost",
    			"prompt": "Why did the LLM cost more per ticket in the race?",
    			"options": [
    				{ "id": "output-tokens", "text": "It pays for the tokens it writes, not only the ones it reads" },
    				{ "id": "retries", "text": "It got tickets wrong and had to try them again" },
    				{ "id": "more-questions", "text": "It was asked more questions per ticket" }
    			],
    			"answerId": "output-tokens",
    			"explanation": "Both read the same ticket and the same five teams, with one request per ticket and no retries. The LLM also writes its answer as text, and every token it writes is billed. Jev returns the answer as data and pays only for what it reads."
    		}
    	]
    }
    ```
    The level JSON is not part of `taskHash` (only task files are), so no recording goes stale. Confirm with `registry.test.ts`.
  - `src/content/testing/levels.ts`: give `testLevel` a `check` with two questions (ids `test-q1`, `test-q2`, three options each, answers `a`).
  - `judge.ts`:
    ```ts
    const JUDGED: ReadonlySet<PredictionOutcome> = new Set([
    	PREDICTION_OUTCOMES.right,
    	PREDICTION_OUTCOMES.wrong
    ])
    /** A level's prediction counts when every clear pick is right and at least one is (user decision, slice 5). */
    export function isPredictionCorrect(verdicts: Verdict[]): boolean {
    	const judged = verdicts.filter((verdict) => JUDGED.has(verdict.outcome))
    	return (
    		judged.length > 0 &&
    		judged.every((verdict) => verdict.outcome === PREDICTION_OUTCOMES.right)
    	)
    }
    export function judgeAll(
    	level: Level,
    	prediction: Prediction,
    	jev: RunTotals,
    	opponent: RunTotals
    ): Verdict[] {
    	return level.predict.questions.map((question) =>
    		judgePrediction(question.metric, prediction[question.metric], [
    			{ racer: RACERS.jev, totals: jev },
    			{ racer: RACERS.llm, totals: opponent }
    		])
    	)
    }
    ```
    `RevealStep` switches to `judgeAll` (behavior unchanged; its tests must still pass).
  - `rules.ts` (plain module, no `server-only`, so it is easy to test):
    ```ts
    import type { Level } from '@/content/level-schema'
    import {
    	BADGES,
    	FIRST_LEVEL_ID,
    	LEVEL_COUNT,
    	LEVEL_STATUS,
    	ORACLE_PREDICTIONS,
    	type BadgeId,
    	type LevelStatus
    } from '@/lib/constants'

    export type BadgeStats = { doneLevelIds: ReadonlySet<string>; correctPredictions: number }

    /** Any activity on a level marks it in progress, except a finished level stays done. */
    export function nextStatusOnActivity(current: LevelStatus | null): LevelStatus {
    	return current === LEVEL_STATUS.done ? LEVEL_STATUS.done : LEVEL_STATUS.inProgress
    }
    export function canSkip(current: LevelStatus | null): boolean {
    	return current === null || current === LEVEL_STATUS.inProgress
    }
    /** Done means Reveal reached and every Check question answered (DESIGN 10). */
    export function isLevelComplete(input: {
    	revealed: boolean
    	answeredQuestionIds: ReadonlySet<string>
    	level: Level
    }): boolean {
    	return (
    		input.revealed &&
    		input.level.check.questions.every((question) => input.answeredQuestionIds.has(question.id))
    	)
    }
    // Badges later slices award (right_tool, phish_spotter, ...) join this table in their slice.
    const BADGE_RULES: { id: BadgeId; earned: (stats: BadgeStats) => boolean }[] = [
    	{ id: BADGES.firstRace, earned: (stats) => stats.doneLevelIds.has(FIRST_LEVEL_ID) },
    	{ id: BADGES.pathfinder, earned: (stats) => stats.doneLevelIds.size >= LEVEL_COUNT },
    	{ id: BADGES.oracle, earned: (stats) => stats.correctPredictions >= ORACLE_PREDICTIONS }
    ]
    export function earnedBadges(stats: BadgeStats): BadgeId[] {
    	return BADGE_RULES.filter((rule) => rule.earned(stats)).map((rule) => rule.id)
    }
    ```
    (Order: the test expects the `BADGE_RULES` order, which follows `BADGES` declaration order for these three.)
  - `constants.ts`: add `LEVEL_STEPS.check` and append it to `LEVEL_STEP_ORDER`; update the comment "Slice 5 adds the Check step." to describe the 5 steps. `StepperNav` renders steps from `LEVEL_STEP_ORDER`, so check its label map and add "Check" (fix its test if it counts steps).
- [ ] **Step 4: Run** `corepack pnpm exec vitest run` (whole suite) and `corepack pnpm typecheck`. All pass. A level stepper test that counts 4 steps is updated to 5.
- [ ] **Step 5: Commit** `feat(levels): add check questions, xp and badge rules`.

---

### Task 2: Prisma models and migrations (controller runs this; it needs the live database)

**Files:**

- Create: `prisma/schema/progress.prisma`
- Modify: `prisma/schema/example.prisma` (User back-relations)
- Generated: `prisma/schema/migrations/<ts>_progress/migration.sql`
- Hand-written (sanctioned): `prisma/schema/migrations/<ts+1>_progress_rls/migration.sql`

**Interfaces:**

- Produces Prisma delegates `db.levelProgress`, `db.checkAnswer`, `db.xpEvent`, `db.userBadge` with these fields:

```prisma
// Per-user progress (DESIGN 10, 11.1). Every table here is user-scoped, so its
// migration is followed by a hand-written ENABLE ROW LEVEL SECURITY (no policy, no FORCE).

// No row means "not started". prediction holds the picks saved at Lock in;
// revealedAt, opponentModelId and predictionCorrect are set once, at the first
// Reveal, and never change (user decision, slice 5).
model LevelProgress {
	userId            String    @map("user_id") @db.Uuid
	levelId           String    @map("level_id")
	status            String
	prediction        Json?
	opponentModelId   String?   @map("opponent_model_id")
	predictionCorrect Boolean?  @map("prediction_correct")
	revealedAt        DateTime? @map("revealed_at") @db.Timestamptz(6)
	updatedAt         DateTime  @default(now()) @updatedAt @map("updated_at") @db.Timestamptz(6)
	user              User      @relation(fields: [userId], references: [id], onDelete: Cascade)

	@@id([userId, levelId])
	@@map("level_progress")
}

// The first answer to each Check question; later tries are local only.
model CheckAnswer {
	userId     String   @map("user_id") @db.Uuid
	questionId String   @map("question_id")
	levelId    String   @map("level_id")
	optionId   String   @map("option_id")
	correct    Boolean
	answeredAt DateTime @default(now()) @map("answered_at") @db.Timestamptz(6)
	user       User     @relation(fields: [userId], references: [id], onDelete: Cascade)

	@@id([userId, questionId])
	@@index([userId, levelId])
	@@map("check_answers")
}

// One row per award; the unique key makes every award idempotent.
model XpEvent {
	id        String   @id @default(uuid()) @db.Uuid
	userId    String   @map("user_id") @db.Uuid
	source    String
	sourceId  String   @map("source_id")
	xp        Int
	createdAt DateTime @default(now()) @map("created_at") @db.Timestamptz(6)
	user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)

	@@unique([userId, source, sourceId])
	@@map("xp_events")
}

model UserBadge {
	userId   String   @map("user_id") @db.Uuid
	badgeId  String   @map("badge_id")
	earnedAt DateTime @default(now()) @map("earned_at") @db.Timestamptz(6)
	user     User     @relation(fields: [userId], references: [id], onDelete: Cascade)

	@@id([userId, badgeId])
	@@map("user_badges")
}
```

`User` gains `levelProgress LevelProgress[]`, `checkAnswers CheckAnswer[]`, `xpEvents XpEvent[]`, `badges UserBadge[]`.

- [ ] **Step 1:** Write the schema, then `corepack pnpm prisma:generate`.
- [ ] **Step 2:** `corepack pnpm exec prisma migrate deploy`, then `node scripts/generate-migration.mjs --name progress --db-url "<DIRECT_URL from .env.local>"` (read the value in the shell, never print it), then `migrate deploy` again.
- [ ] **Step 3:** Create the RLS migration folder with a timestamp one second later, containing only the 4 `ALTER TABLE "<table>" ENABLE ROW LEVEL SECURITY;` lines plus the same header comment as `20261001032000_enable_rls`. `migrate deploy`, `corepack pnpm db:run-once`, `corepack pnpm check:rls` (expects 6 tables).
- [ ] **Step 4:** `corepack pnpm typecheck`, then commit `feat(db): add progress, check, xp and badge tables`.

---

### Task 3: Awards engine, progress actions and reads

**Files:**

- Create: `src/server/awards/awards.ts`, `src/server/actions/progress.ts`, `src/server/data/progress.ts`
- Test: `src/server/awards/awards.test.ts`, `src/server/actions/progress.test.ts`, `src/server/data/progress.test.ts`

**Interfaces:**

- Consumes: Task 1 (`rules.ts`, `judgeAll`, `isPredictionCorrect`, `getCheckQuestion`, `getLevel`, constants), Task 2 (Prisma delegates), `currentRecordings(taskId)` from `src/content/recordings.ts`, `requireUser()` from `src/server/auth/session.ts`, `validatedAction` from `src/server/actions/validated-action.ts`, `AppError` from `src/lib/errors/app-error.ts`, `db` and `Prisma` from `src/server/db/client.ts`.
- Produces:
  ```ts
  // awards.ts (server-only)
  export type Tx = Prisma.TransactionClient
  export type Awards = { xp: number; badges: BadgeId[] } // what this write newly earned
  export async function awardXp(
  	tx: Tx,
  	userId: string,
  	source: XpSource,
  	sourceId: string
  ): Promise<number> // XP newly awarded (0 on repeat)
  export async function syncBadges(tx: Tx, userId: string): Promise<BadgeId[]> // badges newly earned

  // actions/progress.ts ('use server'); every result is ActionResult<...>
  export type LevelProgressView = {
  	status: LevelStatus | null
  	prediction: Prediction // {} when none
  	revealed: boolean
  	opponentModelId: string | null
  	predictionCorrect: boolean | null
  	answers: Record<string, { optionId: string; correct: boolean }> // by questionId
  }
  export const setLevelStatus: (input: {
  	levelId: string
  	status: 'skipped'
  }) => Promise<ActionResult<{ status: LevelStatus }>>
  export const submitPrediction: (input: {
  	levelId: string
  	prediction: Prediction
  }) => Promise<ActionResult<{ saved: boolean }>>
  export const revealPrediction: (input: { levelId: string; opponentModelId: string }) => Promise<
  	ActionResult<{
  		firstReveal: boolean
  		predictionCorrect: boolean
  		awards: Awards
  		levelDone: boolean
  	}>
  >
  export const submitCheck: (input: {
  	levelId: string
  	questionId: string
  	optionId: string
  }) => Promise<
  	ActionResult<{
  		firstAnswer: boolean
  		correct: boolean
  		stored: { optionId: string; correct: boolean }
  		awards: Awards
  		levelDone: boolean
  	}>
  >

  // data/progress.ts (server-only)
  export type ProgressSummary = {
  	statuses: Record<string, LevelStatus>
  	doneCount: number
  	levelCount: number
  	xp: number
  	badges: BadgeId[]
  }
  export async function getProgressSummary(userId: string): Promise<ProgressSummary>
  export async function getLevelProgress(
  	userId: string,
  	levelId: string
  ): Promise<LevelProgressView>
  ```
  Put `LevelProgressView` in `src/features/levels/level-progress.ts` (a plain types-only module) so client code imports it without touching server files; actions and data import it from there.

Behavior (each action body runs in `db.$transaction(async (tx) => ...)`, then calls `refresh()` from `next/cache` after the transaction, before returning):

- Common input schema: `levelId` is `z.string()` and must resolve with `getLevel`; otherwise throw `new AppError('That level does not exist.', { status: 404, code: 'unknown_level' })`. `prediction` is `z.partialRecord(z.enum(PREDICTION_METRIC values), z.enum(PREDICTABLE_RACERS))` (strict: unknown keys rejected), and every key must be a metric the level asks (else 400 AppError `unknown_metric`).
- `setLevelStatus`: only `skipped` is accepted (`z.literal(LEVEL_STATUS.skipped)`). Read the row; if `!canSkip(current)` throw `AppError('This level is already finished or skipped.', { status: 409, code: 'cannot_skip' })`. Upsert status `skipped`. Returns `{ status }`.
- `submitPrediction`: upsert the row with `status: nextStatusOnActivity(current)`. If `revealedAt` is already set, do not change `prediction` and return `{ saved: false }`; else store the picks and return `{ saved: true }`.
- `revealPrediction`: the opponent must be an LLM recording in `currentRecordings(level.taskIds[0])` with that `modelId`, and a Jev recording must exist; otherwise 400 AppError `unknown_opponent`. If the row already has `revealedAt`: return `{ firstReveal: false, predictionCorrect: row.predictionCorrect ?? false, awards: { xp: 0, badges: [] }, levelDone: row.status === done }` without writing. Else: `verdicts = judgeAll(level, storedPrediction, jev.totals, opponent.totals)`, `correct = isPredictionCorrect(verdicts)`; update the row (status via `nextStatusOnActivity`, `revealedAt: new Date()`, `opponentModelId`, `predictionCorrect: correct`); if correct, `awardXp(predictionCorrect, levelId)`; then `completeIfReady` (below); then `syncBadges`. The stored prediction is parsed back with the same Zod schema (bad JSON counts as `{}`).
- `submitCheck`: `getCheckQuestion(questionId)` must exist and belong to `levelId` (else 400 `unknown_question`); `optionId` must be one of its options (else 400 `unknown_option`). `correct = optionId === question.answerId`. Insert with `tx.checkAnswer.createMany({ data: [...], skipDuplicates: true })`; `firstAnswer = count === 1`. If first and correct, `awardXp(checkCorrect, questionId)`. Read back the stored row (`stored`). Upsert the level row status via `nextStatusOnActivity`. Then `completeIfReady`, then `syncBadges`.
- `completeIfReady(tx, userId, level)` (private helper in the actions file): read the row and the user's answered question ids for the level; if `isLevelComplete(...)` and status is not done, set status `done` and `awardXp(levelDone, levelId)`; return whether the level is done.
- `awardXp`: `tx.xpEvent.createMany({ data: [{ userId, source, sourceId, xp: XP_AMOUNTS[source] }], skipDuplicates: true })`; returns `count === 1 ? XP_AMOUNTS[source] : 0`.
- `syncBadges`: stats from `tx.levelProgress.findMany({ where: { userId, status: done }, select: { levelId: true } })` and `tx.levelProgress.count({ where: { userId, predictionCorrect: true } })`; `earnedBadges(stats)`; for each, `tx.userBadge.createMany({ data: [{ userId, badgeId }], skipDuplicates: true })` and collect the ones with `count === 1`.
- Each action sums `awards.xp` over every `awardXp` call it made, and `awards.badges` from `syncBadges`.
- `getLevelProgress`: one `findUnique` on `(userId, levelId)` and one `findMany` on check answers for that level, started together with `Promise.all`; maps to `LevelProgressView`.
- `getProgressSummary`: `Promise.all` of level rows, `xpEvent.aggregate({ _sum: { xp } })` and badges; `statuses` only includes levels that exist in `LEVELS`; `doneCount` counts done statuses among built levels; `levelCount = LEVELS.size`.

- [ ] **Step 1: Write failing tests.** Mock `@/server/db/client` with a hand-rolled fake whose `$transaction(fn)` calls `fn(fakeTx)` and whose delegates are `vi.fn()`s; mock `@/server/auth/session` (`requireUser` resolves `{ userId: USER_ID, email }` or rejects with the 401 AppError), `next/cache` (`refresh: vi.fn()`) and `@/lib/observability/capture-error` (same mock as `src/server/actions/auth.test.ts`). Cases:
  - every action returns `{ ok: false, status: 401 }` when signed out and never touches the db;
  - every `where` uses the session user id (assert the `userId` in calls equals `USER_ID` even when the input contains an extra `userId` field; the strict schema rejects it with 400);
  - unknown level -> 404; unknown metric, question, option, opponent -> 400;
  - `setLevelStatus` on a done level -> 409; on no row -> upsert skipped;
  - `submitPrediction` after reveal returns `{ saved: false }` and does not update `prediction`;
  - `revealPrediction` first time with a correct prediction against the real speed-race recordings (Jev faster and cheaper than Opus; accuracy tie) -> `predictionCorrect: true`, `awards.xp` includes 25; second call -> `firstReveal: false`, no writes, `awards.xp === 0`;
  - `submitCheck` first answer correct -> 20 XP; repeat (createMany count 0) -> `firstAnswer: false`, 0 XP, `stored` is the original row; wrong first answer -> 0 XP and stored wrong;
  - completion: revealed + both answered -> status done, +100 XP, `levelDone: true`, `syncBadges` result `first_race` surfaces in `awards.badges`;
  - `refresh` is called once after a successful write and never on failure.
  - `awards.test.ts`: `awardXp` returns the amount when count is 1 and 0 when 0; `syncBadges` returns only newly created badges.
  - `data/progress.test.ts`: maps rows to the view; ignores rows for unknown level ids; xp sum null -> 0.
- [ ] **Step 2: Run** `corepack pnpm exec vitest run src/server` and confirm failures.
- [ ] **Step 3: Implement** as specified. Keep each file under ~200 lines; no magic numbers (use constants).
- [ ] **Step 4: Run** the full Vitest suite, `corepack pnpm typecheck`, `corepack pnpm lint`.
- [ ] **Step 5: Commit** `feat(progress): add progress actions, xp and badge awards`.

---

### Task 4: Level page wiring and the Check step

**Files:**

- Create: `src/features/levels/use-level-progress.ts`, `src/features/levels/check-step.tsx`, `src/features/levels/level-progress.ts` (if Task 3 did not), `src/features/levels/awards-toast.ts`
- Modify: `src/features/levels/level-stepper.tsx`, `reveal-step.tsx`, `predict-step.tsx` (no API change needed), `src/app/(app)/levels/[levelId]/page.tsx`, `src/lib/analytics/events.ts`
- Test: `src/features/levels/use-level-progress.test.ts`, `src/features/levels/check-step.test.tsx`, `src/features/levels/level-stepper.test.tsx`, `src/features/levels/reveal-step.test.tsx`

**Interfaces:**

- Consumes: Task 3 actions and `LevelProgressView`; `toast` from `src/lib/toast.ts`; `track` from `src/lib/analytics/track.ts`; `BADGE_LABELS`.
- Produces:
  ```ts
  export function useLevelProgress(
  	levelId: string,
  	initial: LevelProgressView
  ): {
  	progress: LevelProgressView
  	lockIn: (prediction: Prediction) => void // optimistic; rolls back + error toast on failure
  	reveal: (opponentModelId: string) => void // call once per Reveal mount; sets celebrate on a correct first reveal
  	answer: (questionId: string, optionId: string) => void
  	celebrate: boolean // true only right after a correct FIRST reveal
  	pendingQuestionId: string | null
  }
  export function CheckStep(props: {
  	questions: CheckQuestion[]
  	answers: LevelProgressView['answers']
  	pendingQuestionId: string | null
  	onAnswer: (questionId: string, optionId: string) => void
  	onBackToPath: () => void
  }): JSX.Element
  export function announceAwards(awards: Awards): void // awards-toast.ts: "+N XP" toast, one toast per new badge "Badge earned: <name>"
  ```

Behavior:

- Page: keep `generateStaticParams`, metadata and the static level/task/recordings props. Inside the existing `<Suspense fallback={<LevelSkeleton />}>`, render an async `LevelProgressLoader` server component (in the page file) that calls `getSession()` and `getLevelProgress(session.userId, level.id)` (no session -> `redirect(ROUTES.signIn)`), then renders `<LevelStepper ... initialProgress={view} />`.
- `useLevelProgress` uses `useMutation` from TanStack Query for each action, with `onMutate` applying the optimistic change to local state (`useState` seeded from `initial`), `onError` restoring the previous state and showing `toast({ title: "Couldn't save your progress", description: <action error>, variant: 'destructive' })`, and `onSuccess` calling `announceAwards` and analytics. An `{ ok: false }` result is treated as an error (throw inside `mutationFn`).
  - `lockIn`: optimistic `prediction`; `track('prediction_made', { level_id })`; `track('level_started', { level_id })` when the status was null before.
  - `reveal`: skipped entirely when `progress.revealed` is already true at call time (no request, no confetti). On success with `firstReveal && predictionCorrect`, set `celebrate = true`. Update `revealed`, `predictionCorrect`, `opponentModelId` from the result. If `levelDone`, set status done and `track('level_completed', { level_id })`.
  - `answer`: if the question already has a stored answer, do nothing (retries are local to `CheckStep`). Optimistic stored answer uses the content's answerId to compute `correct` (the server result replaces it). On `levelDone` -> status done + `level_completed`.
- Analytics: add `LEVEL_STARTED: 'level_started'`, `LEVEL_COMPLETED: 'level_completed'`, `PREDICTION_MADE: 'prediction_made'` to `ANALYTICS_EVENTS`, each with props `{ level_id: string }` in `EventProps`.
- `LevelStepper`: takes `initialProgress: LevelProgressView`. Predict's `initial` is `progress.prediction`; on submit call `lockIn(next)` then go to Play. Reveal receives `celebrate` and an `onReveal` callback; Reveal calls `onReveal(opponent.modelId)` once on mount when both recordings exist (an effect keyed on the opponent id; the hook ignores repeats). Reveal gets a "Check what you learned" primary button -> `goTo(LEVEL_STEPS.check)`. Add the Check step render.
- `RevealStep`: replace `useCelebration(verdicts.some(right))` with `useCelebration(celebrate)`. When `progress.revealed` is true and the stored opponent differs from the one shown, show one muted line under the prediction results: "Your prediction was scored against <model display name> on your first Reveal." (use the existing racer name helper in `src/features/race/racer-names.ts`).
- `CheckStep` (pure): heading "Check" (`id="check-heading" tabIndex={-1}` like other steps). One `<form>` per question, a radio group (`fieldset`/`legend` = prompt) and a "Check answer" submit button disabled until an option is picked. After an answer exists (stored, or a local retry), show "Right" or "Not quite" with an icon plus text, the right option's text ("The answer: ..."), and the explanation. If the stored answer was wrong, show a "Try again" `type="button"` that clears the local pick only; a retry's result shows locally with the note "Practice only: your first answer is the one that counts." When every question has a stored answer, show "Level complete" (only if `progress.status === done`) and a "Back to Path" button (`onBackToPath` -> `router.push(ROUTES.path)`, wired in the stepper).
- Tests:
  - `use-level-progress.test.ts` (mock `@/server/actions/progress`, `@/lib/toast`, `@/lib/analytics/track`; wrap in a `QueryClientProvider`): optimistic lock-in then rollback on `{ ok: false }` with a destructive toast; `reveal` is not called when already revealed; `celebrate` true only for a first correct reveal; `answer` ignored when already stored; awards toast text "+25 XP" and "Badge earned: First Race".
  - `check-step.test.tsx`: submit is disabled until a pick; Enter submits; stored wrong answer shows "Not quite", the right answer and "Try again"; a retry shows the practice note and does not call `onAnswer`; stored right answer shows "Right" and no "Try again".
  - `level-stepper.test.tsx`: five steps in the nav; Predict starts from `initialProgress.prediction`; Check step renders from `?step=check`.
  - `reveal-step.test.tsx`: confetti mock called only when `celebrate` is true.
- [ ] **Step 1:** Write the failing tests above. **Step 2:** run them, confirm failures. **Step 3:** implement. **Step 4:** full Vitest, typecheck, lint, then `corepack pnpm build` (the level page must still prerender its shell). **Step 5:** commit `feat(levels): save progress and add the check step`.

---

### Task 5: Path, Home and the header progress bar

**Files:**

- Create: `src/features/progress/level-status-label.tsx`, `path-view.tsx`, `use-skip-level.ts`, `progress-bar.tsx`, `home-progress.tsx`, `src/app/(app)/path/page.tsx`, `src/features/progress/path-skeleton.tsx`
- Modify: `src/app/(app)/page.tsx`, `src/features/shell/site-header.tsx`
- Test: `level-status-label.test.tsx`, `path-view.test.tsx`, `use-skip-level.test.ts`, `progress-bar.test.tsx`, `home-progress.test.tsx`

**Interfaces:**

- Consumes: `getProgressSummary`, `getSession`, `setLevelStatus`, `LEVELS`, `ROUTES`, `BADGE_LABELS`, `LEVEL_STATUS`.
- Produces:
  ```ts
  export function LevelStatusLabel({ status }: { status: LevelStatus | null }): JSX.Element // icon + text: Not started / In progress / Done / Skipped
  export type PathLevel = { id: string; order: number; title: string }
  export function PathView(props: {
  	levels: PathLevel[]
  	statuses: Record<string, LevelStatus>
  	pendingLevelId: string | null
  	onSkip: (levelId: string) => void
  }): JSX.Element
  export function useSkipLevel(initial: Record<string, LevelStatus>): {
  	statuses: Record<string, LevelStatus>
  	skip: (levelId: string) => void
  	pendingLevelId: string | null
  }
  export function ProgressBar({ done, total }: { done: number; total: number }): JSX.Element
  export function HomeProgress(props: {
  	summary: ProgressSummary
  	firstLevel: PathLevel
  }): JSX.Element
  ```

Behavior:

- `/path` page: static heading "Your path" and one line of intro ("Play the levels in any order. Skip one and come back whenever you like."); a `<Suspense fallback={<PathSkeleton />}>` child server component reads the session (redirect to sign-in if none) and `getProgressSummary`, then renders a client wrapper that calls `useSkipLevel` and `PathView`. Levels come from `LEVELS` (built levels only, user decision 4) mapped to `PathLevel`.
- `PathView`: an ordered list of cards (`Card` from `src/components/ui/card.tsx`), each with "Level <order>", the title, `LevelStatusLabel`, and actions:
  - no row: primary link "Play" -> `ROUTES.level(id)`, plus `type="button"` "Skip";
  - in progress: link "Continue", plus "Skip";
  - done or skipped: link "Revisit" (R28). No Skip.
    The Skip button shows a pending state for its level and is disabled while pending.
- `useSkipLevel`: optimistic status `skipped`, rollback plus destructive toast on `{ ok: false }`, success toast "Level skipped. You can revisit it any time."
- `ProgressBar`: an accessible `role="progressbar"` with `aria-valuenow={done}`, `aria-valuemin={0}`, `aria-valuemax={total}`, `aria-label="Path progress"`, a visible text "<done>/<total>" and a token-colored fill (`bg-accent`) whose width is a percentage via an inline `style={{ width: ... }}` (the only allowed inline style; a percentage is data, not a design value). It links to `ROUTES.path`.
- Header: add a "Path" nav link (`ROUTES.path`, `aria-current="page"` is not needed now) and, inside a `<Suspense>` with a small pulse skeleton, an async server component that reads the session and `getProgressSummary` and renders `ProgressBar`. It must fit at 360-390 px with no horizontal scroll: at phone width hide the "Path" text link's neighbors as needed (the bar itself links to Path, so the link may be `hidden sm:inline`), and keep the email hidden as today.
- Home: keep the welcome copy and the "Play level 1: Speed Race" primary button (R65) and the Glossary button; add a `<Suspense>` section that renders `HomeProgress`: "<done> of <total> levels done", the `ProgressBar`, total XP ("<xp> XP"), the badges earned (names from `BADGE_LABELS`, or "No badges yet. Finish level 1 to earn your first.") and a secondary link "See your path" -> `ROUTES.path`. The start-quiz card is not added (quizzes arrive in slice 12; no dead links).
- Tests: status label text for all 4 states; PathView buttons per state and `onSkip` called with the id; skip rollback on failure; progress bar aria values and text "1/1"; HomeProgress empty-badges copy and XP text.
- [ ] **Step 1:** failing tests. **Step 2:** run, confirm failures. **Step 3:** implement. **Step 4:** full Vitest, typecheck, lint, build (`/path` renders as PPR: static shell + dynamic hole). **Step 5:** commit `feat(progress): add path, home progress and the header bar`.

---

### Task 6: End-to-end flows 1 and 2, screenshots, docs

**Files:**

- Create: `e2e/progress.spec.ts`
- Modify: `e2e/level-1.spec.ts` (the Reveal step now has a Check button; keep its tests green), `DESIGN.md` 11.1 and 11.3
- Test: the e2e files themselves

Behavior:

- Flow 1 (one fresh sign-up): Home shows "0 of 1 levels done" and "0/1" in the header -> click "Play level 1: Speed Race" -> Learn -> Predict all three as Jev -> Lock in -> Play -> Skip to result -> Reveal (expect the prediction results and a "+25 XP" toast) -> "Check what you learned" -> answer Q1 right, Q2 wrong -> "Not quite", "Try again" works and shows the practice note -> "Level complete" -> header shows "1/1" -> Home shows XP 145 (25 + 20 + 100) and badge "First Race".
- Replay awards once: reload the level, go through Reveal and Check again, confirm the Home XP is still 145 and Reveal does not show a new XP toast.
- Reload keeps the prediction: on a second fresh account, lock in a prediction, reload `?step=predict`, the picks are still checked.
- Flow 2: Path -> Skip level 1 -> status "Skipped" and the skip toast -> "Revisit" opens the level -> lock in a prediction -> Path shows "In progress".
- Screenshots of Path, Home (with progress) and the Check step, light and dark, 1280 and 390 px, to `e2e/screenshots/`, with `expectNoHorizontalScroll` at 390 px.
- `DESIGN.md`: 11.1 LevelProgress fields now include `prediction`, `opponentModelId`, `revealedAt`; CheckAnswer has `optionId`. 11.3 lists `revealPrediction` (judges the first Reveal on the server and is final) and says progress actions call `refresh()` from `next/cache` because per-user reads are not cached, so there is no tag to update.
- [ ] **Step 1:** write the e2e tests. **Step 2:** `corepack pnpm test:e2e` (dev server via Playwright's `webServer`). Fix real failures in the app code, not by weakening tests. **Step 3:** commit `test(e2e): cover progress, check and path flows` and `docs(design): match progress models and actions`.
