# Slice 4 - Level Loop + Race View Implementation Plan (key-independent part)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `useRace` over recorded replays, the race view (tracks, counters, Skip to result, scoreboard), `RacerTag`, `ModeLabel`, the opponent picker, the level content schema and loader, and the level stepper (Learn, Predict, Play, Reveal with `?step=`), all tested with fixtures. Level 1's content, its route and the Home button are written but stay uncommitted until the Speed Race recording exists.

**Architecture:** Views never call the runner. `useRace` (`src/features/race/use-race.ts`) starts one `replaySource` per Recording, feeds every `RunEvent` through a pure reducer (`race-state.ts`) that keeps per-racer state using the runner's own `computeTotals`, and ticks a clock while running. Components are pure (props in, callbacks out); the only hook callers are the containers `RaceStage` and `LevelStepper`. Level content is versioned JSON validated by Zod and imported through an explicit registry, like tasks. Reveal reads its numbers from the Recordings at render time and judges the prediction with a pure function.

**Tech Stack:** React 19 + Next.js 16 App Router (Cache Components on), TypeScript strict, Zod 4, Tailwind v4 tokens, Radix Popover, Motion (`m.*` inside the existing `LazyMotion strict`), canvas-confetti, Vitest + Testing Library (jsdom, fake timers).

**Spec:** `DESIGN.md` 2, 3.2 (`replay.ts`, `combine`), 3.3 (`useRace`), 4.1 (levels row), 5.1 (`ModeLabel`), 6 (`/levels/[levelId]` row, opponent picker popover, states), 7 (level 1 row), 13.2 (racer identity), 16 (slice 4); `spec.md` 3.2 (R6, R7), 6.1 (R24-R28), 6.2 (level 1), 11 (R68, R72), 12.3 (R88-R91), 12.4, R44, R84, R86.

## User rulings for this slice (2026-10-01)

- Level 1 Predict asks three two-way picks (Jev or the LLM): who finishes first, who costs less, who gets more right. Reveal marks each one right or wrong against the real recording.
- Home gets a "Play level 1: Speed Race" button now, landing in the same commit as level 1's content, so the link never points at a missing page.
- Only key-independent work happens now. `content/tasks/speed-race.json` and the `src/content/tasks.ts` edit stay uncommitted; Task 7's files stay uncommitted with them.

## Decisions taken in this plan

- `generateStaticParams` must return at least one param under Cache Components (`node_modules/next/dist/docs/01-app/03-api-reference/04-functions/generate-static-params.md`, "must return at least one param"). The committed level registry is empty until level 1's content lands, so the route page `src/app/(app)/levels/[levelId]/page.tsx` is Task 7 and stays uncommitted.
- `useRace({ task, entries })` takes Recordings only (Beginner mode). Slice 8 adds the live source and the `mode` switch; nothing here pre-builds it.
- Live counters use `computeTotals` from the runner over the results so far, and the final numbers are the recorded `run_finished` totals, so views never compute accuracy or cost (R92).
- Changing the opponent remounts `RaceStage` with a `key`, which aborts the old replay through the hook's unmount cleanup. No reset logic is needed in the hook.
- The prediction and opponent live in `LevelStepper` state. A reload loses the prediction; slice 5 stores it on the server. Reveal says "No prediction" for a missing pick.
- Racer colors are at least 3:1, not 4.5:1, so they color icons, bars and fills only. Racer names render in `text-text`.
- Reveal's scoreboard lists every current recording of the task (Jev, the chosen opponent, then the other Claude models), so R26 holds for every recorded model.
- `prediction_made` and `level_started` analytics events arrive in slice 5 with the progress actions.
- DESIGN 4.1's levels row is updated to the real shape (Task 4).

## Global Constraints

- Run every package script as `corepack pnpm <script>` (pnpm is not on PATH). Vitest alone: `corepack pnpm exec vitest run <path>`.
- The working tree holds uncommitted files that are not yours: `content/tasks/speed-race.json`, `src/content/tasks.ts`, `docs/progress.md`, `.claude-logs/`, `.superpowers/`, `docs/superpowers/plans/2026-10-01-slice-03-recording-cli.md`. Never stage, edit, revert or delete them. Never run `git add -A`, `git add .`, `git stash` or `git checkout -- <path>`. Stage only the files your task lists, by name.
- Because of that uncommitted task file, the full `corepack pnpm test` has exactly one expected failure: `src/content/registry.test.ts` > "has a current recording for Jev and all three Claude models for every task" (speed-race has no recordings yet). Every other test must pass.
- No emojis anywhere. No long dashes in code, comments, copy or docs: use a single hyphen "-".
- No `any`, no `as` type assertions (narrow with type guards or Zod), no non-null `!` assertions.
- Enum-like values come from `src/lib/constants.ts` (`RACERS`, `RUN_EVENTS`, `CLAUDE_MODELS`, `DEFAULT_OPPONENT`, `RACE_LANES`, `ANSWER_KEY`, `QUESTION_KINDS`, plus the ones this plan adds). Never repeat them as inline literals in `src/` code. Test fixtures may use literals.
- No magic numbers: name every threshold, size and duration as a `const`.
- Never `console.*` in `src/`.
- UI: design tokens only (`bg-surface`, `text-text-muted`, `border-border`, `text-jev`, `bg-llm`, ...), no hex, no pixel radii, no arbitrary values. Icons only from `@/components/ui/icons`. Use `m.*` from `motion/react`, never `motion.*`. Model output and user text render as plain text; `dangerouslySetInnerHTML` is banned (R86). Color is never the only signal (R90): every status has text or an icon with text.
- Components are pure: no data fetching, timers or business logic inside them. Hooks hold timers and effects.
- Forms: a real `<form onSubmit>` with `event.preventDefault()`, `type="submit"` on the primary button and `type="button"` on every other button.
- React Compiler runs with `panicThreshold: 'all_errors'`, and ESLint runs with zero warnings. Don't mutate values returned by `useState`; mutate only `ref.current` properties, and only in event handlers or effects.
- Every test file that renders components runs in jsdom (the default). Test fixtures are not product content (ROADMAP Rule-5) and live under a `testing/` folder.
- Commits: Conventional Commits, header 72 characters or less, scope `race` or `levels` or `content`, body lines wrapped at 100, ending with these two lines:
  `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`
  `Claude-Session: https://claude.ai/code/session_01Vme75YtvfRzT3i2uXgd6TQ`
  Commit straight to `main`. Do not push. Task 7 is never committed.
- Before each commit run: the task's Vitest files, `corepack pnpm lint`, `corepack pnpm typecheck` and `corepack pnpm format:check` (run `corepack pnpm exec prettier --write <your files>` first if it fails on your files only).

---

### Task 1: `useRace` and the race state

**Files:**

- Modify: `src/lib/constants.ts` (append `RACE_STATUS`)
- Create: `src/features/race/race-state.ts`
- Create: `src/features/race/use-race.ts`
- Create: `src/features/race/testing/recordings.ts`
- Test: `src/features/race/race-state.test.ts`, `src/features/race/use-race.test.ts`

**Interfaces:**

- Consumes: `replaySource(recording, { onEvent, signal }) -> { skip, done }` (`src/runner/replay.ts`), `createCombineTap(task, onEvent)` (`src/runner/combine.ts`), `computeTotals(results, wallMs)` (`src/runner/totals.ts`), `Recording` (`src/content/recording-schema.ts`), `Task` (`src/content/task-schema.ts`), `RunEvent`, `ItemResult`, `RunTotals` (`src/runner/types.ts`), fixtures `choiceTask`, `countTask` (`src/runner/testing/tasks.ts`).
- Produces:
  - `RACE_STATUS`, `type RaceStatus` in constants.
  - `type RacerState = { racer: Racer; itemsTotal: number; inFlight: number; results: ItemResult[]; progress: RunTotals; totals: RunTotals | null }`
  - `type RaceState = Partial<Record<Racer, RacerState>>`
  - `raceRacers(task: Task, racers: readonly Racer[]): Racer[]`
  - `initialRaceState(racers: readonly Racer[], itemsTotal: number): RaceState`
  - `raceReducer(state: RaceState, event: RunEvent): RaceState`
  - `racerTimeMs(racer: RacerState, elapsedMs: number): number`
  - `type RaceEntry = { racer: Recording['racer']; recording: Recording }`
  - `useRace({ task, entries }: { task: Task; entries: RaceEntry[] }): RaceControls` where `RaceControls = { status: RaceStatus; racers: Racer[]; perRacer: RaceState; elapsedMs: number; start: () => void; skip: () => void; cancel: () => void }`
  - Fixtures `jevRecording`, `opusRecording`, `sonnetRecording` for `choiceTask` (test-only).

- [ ] **Step 1: Add the status constant**

Append to `src/lib/constants.ts`:

```ts
// A race's lifecycle in useRace (DESIGN 3.3).
export const RACE_STATUS = { idle: 'idle', running: 'running', finished: 'finished' } as const
export type RaceStatus = (typeof RACE_STATUS)[keyof typeof RACE_STATUS]
```

- [ ] **Step 2: Write the test fixtures**

`src/features/race/testing/recordings.ts`:

```ts
import { recordingSchema, type Recording } from '@/content/recording-schema'
import { choiceTask } from '@/runner/testing/tasks'

// Small, valid Recordings of choiceTask (items t1 billing, t2 technical, t3
// unlabelled) for race and level tests. Not product content (ROADMAP Rule-5).

const HASH = 'a'.repeat(64)
const RECORDED_AT = '2026-10-02T10:00:00.000Z'

function jevParsed(choice: string) {
	return {
		answer: {
			type: 'choice',
			choice,
			probabilities: { billing: 0.1, technical: 0.1, sales: 0.1, [choice]: 0.8 },
			confidence: 0.8
		}
	}
}

function event(
	itemId: string,
	lane: number,
	startMs: number,
	endMs: number,
	result: { ok: boolean; raw: string; parsed: unknown; credit: number | null },
	usage: { inputTokens: number; outputTokens: number },
	costUsd: number
) {
	return {
		itemId,
		lane,
		startMs,
		endMs,
		...result,
		correct: result.credit === null ? null : result.credit === 1,
		latencyMs: endMs - startMs,
		usage,
		costUsd
	}
}

const JEV_USAGE = { inputTokens: 20, outputTokens: 1 }
const JEV_COST = 0.00000084

export const jevRecording: Recording = recordingSchema.parse({
	taskId: choiceTask.id,
	taskHash: HASH,
	racer: 'jev',
	modelId: 'jev-1.13.0',
	recordedAt: RECORDED_AT,
	price: { inputPerM: 0.042, outputPerM: 0, source: 'https://docs.typesafe.ai/pricing' },
	lanes: 4,
	events: [
		event(
			't1',
			0,
			0,
			100,
			{ ok: true, raw: '{}', parsed: jevParsed('billing'), credit: 1 },
			JEV_USAGE,
			JEV_COST
		),
		event(
			't2',
			1,
			0,
			120,
			{ ok: true, raw: '{}', parsed: jevParsed('technical'), credit: 1 },
			JEV_USAGE,
			JEV_COST
		),
		event(
			't3',
			2,
			0,
			90,
			{ ok: true, raw: '{}', parsed: jevParsed('sales'), credit: null },
			JEV_USAGE,
			JEV_COST
		)
	],
	totals: {
		items: 3,
		scored: 2,
		correct: 2,
		accuracy: 1,
		wallMs: 120,
		costUsd: 0.00000252,
		inputTokens: 60,
		outputTokens: 3,
		parseFailures: 0
	}
})

const LLM_USAGE = { inputTokens: 150, outputTokens: 10 }
const OPUS_COST = 0.0008

export const opusRecording: Recording = recordingSchema.parse({
	taskId: choiceTask.id,
	taskHash: HASH,
	racer: 'llm',
	modelId: 'claude-opus-5-5',
	recordedAt: RECORDED_AT,
	price: { inputPerM: 4, outputPerM: 20, source: 'https://platform.claude.com/docs/pricing' },
	lanes: 4,
	events: [
		event(
			't1',
			0,
			0,
			900,
			{ ok: true, raw: '{"answer":"billing"}', parsed: 'billing', credit: 1 },
			LLM_USAGE,
			OPUS_COST
		),
		event(
			't2',
			1,
			0,
			1100,
			{ ok: false, raw: 'Sure! It is technical.', parsed: null, credit: 0 },
			LLM_USAGE,
			OPUS_COST
		),
		event(
			't3',
			2,
			0,
			1000,
			{ ok: true, raw: '{"answer":"billing"}', parsed: 'billing', credit: null },
			LLM_USAGE,
			OPUS_COST
		)
	],
	totals: {
		items: 3,
		scored: 2,
		correct: 1,
		accuracy: 0.5,
		wallMs: 1100,
		costUsd: 0.0024,
		inputTokens: 450,
		outputTokens: 30,
		parseFailures: 1
	}
})

const SONNET_COST = 0.0004

export const sonnetRecording: Recording = recordingSchema.parse({
	...opusRecording,
	modelId: 'claude-sonnet-5-5',
	price: { inputPerM: 2, outputPerM: 10, source: 'https://platform.claude.com/docs/pricing' },
	events: opusRecording.events.map((recorded) => ({ ...recorded, costUsd: SONNET_COST })),
	totals: { ...opusRecording.totals, costUsd: 0.0012 }
})
```

- [ ] **Step 3: Write the failing race-state tests**

`src/features/race/race-state.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { choiceTask, countTask } from '@/runner/testing/tasks'
import { jevRecording } from './testing/recordings'
import { initialRaceState, raceRacers, raceReducer, racerTimeMs } from './race-state'

const [first] = jevRecording.events
if (!first) throw new Error('fixture has no events')
const { lane, startMs, endMs, ...result } = first

describe('raceRacers', () => {
	it('keeps the racers as given when the task has no combine', () => {
		expect(raceRacers(choiceTask, ['jev', 'llm'])).toEqual(['jev', 'llm'])
	})

	it('adds Jev + Code right after Jev when the task combines', () => {
		expect(raceRacers(countTask, ['jev', 'llm'])).toEqual(['jev', 'jev_code', 'llm'])
	})
})

describe('raceReducer', () => {
	const start = initialRaceState(['jev', 'llm'], 3)

	it('starts every racer empty', () => {
		expect(start.jev).toMatchObject({
			racer: 'jev',
			itemsTotal: 3,
			inFlight: 0,
			results: [],
			totals: null
		})
		expect(start.jev?.progress.items).toBe(0)
		expect(start.code).toBeUndefined()
	})

	it('counts a started call as in flight', () => {
		const next = raceReducer(start, {
			type: 'item_started',
			racer: 'jev',
			itemId: 't1',
			lane,
			atMs: startMs
		})
		expect(next.jev?.inFlight).toBe(1)
		expect(next.llm).toBe(start.llm)
	})

	it('adds a finished result and recomputes the live totals with the runner', () => {
		const started = raceReducer(start, {
			type: 'item_started',
			racer: 'jev',
			itemId: 't1',
			lane,
			atMs: startMs
		})
		const next = raceReducer(started, {
			type: 'item_finished',
			racer: 'jev',
			lane,
			atMs: endMs,
			result
		})
		expect(next.jev?.inFlight).toBe(0)
		expect(next.jev?.results).toEqual([result])
		expect(next.jev?.progress).toMatchObject({ items: 1, correct: 1, accuracy: 1, wallMs: endMs })
	})

	it('takes the recorded totals when the run finishes', () => {
		const next = raceReducer(start, {
			type: 'run_finished',
			racer: 'jev',
			atMs: 120,
			totals: jevRecording.totals
		})
		expect(next.jev?.totals).toEqual(jevRecording.totals)
	})

	it('ignores events for a racer that is not in the race', () => {
		const next = raceReducer(start, {
			type: 'item_started',
			racer: 'code',
			itemId: 't1',
			lane,
			atMs: startMs
		})
		expect(next).toBe(start)
	})
})

describe('racerTimeMs', () => {
	it('follows the race clock until the racer finishes, then shows its recorded wall time', () => {
		const state = initialRaceState(['jev'], 3)
		const racer = state.jev
		if (!racer) throw new Error('missing racer')
		expect(racerTimeMs(racer, 75)).toBe(75)
		expect(racerTimeMs({ ...racer, totals: jevRecording.totals }, 5000)).toBe(120)
	})
})
```

- [ ] **Step 4: Run them to see them fail**

Run: `corepack pnpm exec vitest run src/features/race/race-state.test.ts`
Expected: FAIL, cannot resolve `./race-state`.

- [ ] **Step 5: Implement the race state**

`src/features/race/race-state.ts`:

```ts
import type { Task } from '@/content/task-schema'
import { RACERS, RUN_EVENTS, type Racer } from '@/lib/constants'
import { computeTotals } from '@/runner/totals'
import type { ItemResult, RunEvent, RunTotals } from '@/runner/types'

export type RacerState = {
	racer: Racer
	itemsTotal: number
	// Calls started and not yet finished: one per busy lane.
	inFlight: number
	results: ItemResult[]
	// The runner's totals over the results so far, for the live counters.
	progress: RunTotals
	// The final totals from the run_finished event; null until then.
	totals: RunTotals | null
}

export type RaceState = Partial<Record<Racer, RacerState>>

/** The racers a race shows, with Jev + Code right after Jev when the task combines (DESIGN 3.2). */
export function raceRacers(task: Task, racers: readonly Racer[]): Racer[] {
	return racers.flatMap((racer) =>
		racer === RACERS.jev && task.combine ? [racer, RACERS.jevCode] : [racer]
	)
}

export function initialRaceState(racers: readonly Racer[], itemsTotal: number): RaceState {
	const state: RaceState = {}
	for (const racer of racers) {
		state[racer] = {
			racer,
			itemsTotal,
			inFlight: 0,
			results: [],
			progress: computeTotals([], 0),
			totals: null
		}
	}
	return state
}

/** Folds one RunEvent into the race. Live numbers come from the runner's computeTotals (R92). */
export function raceReducer(state: RaceState, event: RunEvent): RaceState {
	const current = state[event.racer]
	if (!current) return state
	switch (event.type) {
		case RUN_EVENTS.itemStarted:
			return { ...state, [event.racer]: { ...current, inFlight: current.inFlight + 1 } }
		case RUN_EVENTS.itemFinished: {
			const results = [...current.results, event.result]
			return {
				...state,
				[event.racer]: {
					...current,
					inFlight: Math.max(0, current.inFlight - 1),
					results,
					progress: computeTotals(results, event.atMs)
				}
			}
		}
		case RUN_EVENTS.runFinished:
			return { ...state, [event.racer]: { ...current, inFlight: 0, totals: event.totals } }
	}
}

/** A racer's clock: the race clock while it runs, its recorded wall time once it finishes. */
export function racerTimeMs(racer: RacerState, elapsedMs: number): number {
	return racer.totals ? racer.totals.wallMs : elapsedMs
}
```

- [ ] **Step 6: Run the race-state tests**

Run: `corepack pnpm exec vitest run src/features/race/race-state.test.ts`
Expected: PASS.

- [ ] **Step 7: Write the failing hook tests**

`src/features/race/use-race.test.ts`:

```ts
import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { choiceTask } from '@/runner/testing/tasks'
import { jevRecording, opusRecording } from './testing/recordings'
import { useRace, type RaceEntry } from './use-race'

const entries: RaceEntry[] = [
	{ racer: 'jev', recording: jevRecording },
	{ racer: 'llm', recording: opusRecording }
]

function setup() {
	return renderHook(() => useRace({ task: choiceTask, entries }))
}

async function advance(ms: number) {
	await act(async () => {
		await vi.advanceTimersByTimeAsync(ms)
	})
}

beforeEach(() => vi.useFakeTimers())
afterEach(() => vi.useRealTimers())

describe('useRace', () => {
	it('starts idle with an empty state per racer', () => {
		const { result } = setup()
		expect(result.current.status).toBe('idle')
		expect(result.current.racers).toEqual(['jev', 'llm'])
		expect(result.current.perRacer.jev?.results).toEqual([])
		expect(result.current.elapsedMs).toBe(0)
	})

	it('replays each recording at its recorded speed', async () => {
		const { result } = setup()
		act(() => result.current.start())
		expect(result.current.status).toBe('running')

		// Jev's t3 ends at 90 ms, t1 at 100 ms, t2 at 120 ms.
		await advance(95)
		expect(result.current.perRacer.jev?.results).toHaveLength(1)
		expect(result.current.perRacer.llm?.results).toHaveLength(0)

		await advance(30)
		expect(result.current.perRacer.jev?.totals).toEqual(jevRecording.totals)
		expect(result.current.status).toBe('running')

		await advance(1000)
		expect(result.current.perRacer.llm?.totals).toEqual(opusRecording.totals)
		expect(result.current.status).toBe('finished')
	})

	it('ticks the race clock while running', async () => {
		const { result } = setup()
		act(() => result.current.start())
		await advance(500)
		expect(result.current.elapsedMs).toBeGreaterThanOrEqual(400)
		expect(result.current.elapsedMs).toBeLessThanOrEqual(500)
	})

	it('skips to the recorded result', async () => {
		const { result } = setup()
		act(() => result.current.start())
		await advance(10)
		await act(async () => {
			result.current.skip()
		})
		expect(result.current.perRacer.jev?.totals).toEqual(jevRecording.totals)
		expect(result.current.perRacer.llm?.totals).toEqual(opusRecording.totals)
		expect(result.current.status).toBe('finished')
	})

	it('cancels back to idle and drops the rest of the replay', async () => {
		const { result } = setup()
		act(() => result.current.start())
		await advance(100)
		act(() => result.current.cancel())
		expect(result.current.status).toBe('idle')
		expect(result.current.perRacer.jev?.results).toEqual([])

		await advance(2000)
		expect(result.current.perRacer.llm?.results).toEqual([])
		expect(result.current.status).toBe('idle')
	})

	it('can race again after finishing', async () => {
		const { result } = setup()
		act(() => result.current.start())
		await advance(1200)
		expect(result.current.status).toBe('finished')

		act(() => result.current.start())
		expect(result.current.status).toBe('running')
		expect(result.current.perRacer.jev?.results).toEqual([])
	})

	it('stops every timer when unmounted mid-race', async () => {
		const { result, unmount } = setup()
		act(() => result.current.start())
		await advance(50)
		unmount()
		expect(vi.getTimerCount()).toBe(0)
	})
})
```

- [ ] **Step 8: Run them to see them fail**

Run: `corepack pnpm exec vitest run src/features/race/use-race.test.ts`
Expected: FAIL, cannot resolve `./use-race`.

- [ ] **Step 9: Implement the hook**

`src/features/race/use-race.ts`:

```ts
'use client'

import { useEffect, useRef, useState } from 'react'
import type { Recording } from '@/content/recording-schema'
import type { Task } from '@/content/task-schema'
import { RACE_STATUS, type Racer, type RaceStatus } from '@/lib/constants'
import { createCombineTap } from '@/runner/combine'
import { replaySource, type ReplayHandle } from '@/runner/replay'
import { initialRaceState, raceRacers, raceReducer, type RaceState } from './race-state'

// How often the race clock refreshes while a race runs.
const CLOCK_TICK_MS = 100

export type RaceEntry = { racer: Recording['racer']; recording: Recording }

export type RaceControls = {
	status: RaceStatus
	racers: Racer[]
	perRacer: RaceState
	elapsedMs: number
	start: () => void
	skip: () => void
	cancel: () => void
}

type ActiveRun = {
	controller: AbortController
	handles: ReplayHandle[]
	clock: ReturnType<typeof setInterval>
}

function stopRun(run: ActiveRun | null): void {
	if (!run) return
	run.controller.abort()
	clearInterval(run.clock)
}

/**
 * Plays a race from Recordings at their recorded speed (DESIGN 3.3, R7).
 * skip() jumps to the recorded totals. Slice 8 adds the live source.
 */
export function useRace({ task, entries }: { task: Task; entries: RaceEntry[] }): RaceControls {
	const racers = raceRacers(
		task,
		entries.map((entry) => entry.racer)
	)
	const itemsTotal = task.items.length
	const [perRacer, setPerRacer] = useState(() => initialRaceState(racers, itemsTotal))
	const [status, setStatus] = useState<RaceStatus>(RACE_STATUS.idle)
	const [elapsedMs, setElapsedMs] = useState(0)
	// A stable box, so the unmount cleanup sees the run that is live then.
	const active = useRef<{ run: ActiveRun | null }>({ run: null })

	useEffect(() => {
		const box = active.current
		return () => {
			stopRun(box.run)
			box.run = null
		}
	}, [])

	function start(): void {
		if (active.current.run) return
		const controller = new AbortController()
		const startedAt = Date.now()
		setPerRacer(initialRaceState(racers, itemsTotal))
		setElapsedMs(0)
		setStatus(RACE_STATUS.running)
		// One tap per run: it accumulates Jev + Code results for their totals.
		const onEvent = createCombineTap(task, (event) =>
			setPerRacer((state) => raceReducer(state, event))
		)
		const handles = entries.map(({ recording }) =>
			replaySource(recording, { onEvent, signal: controller.signal })
		)
		const clock = setInterval(() => setElapsedMs(Date.now() - startedAt), CLOCK_TICK_MS)
		active.current.run = { controller, handles, clock }
		void Promise.all(handles.map((handle) => handle.done)).then(() => {
			if (controller.signal.aborted) return
			clearInterval(clock)
			setElapsedMs(Date.now() - startedAt)
			active.current.run = null
			setStatus(RACE_STATUS.finished)
		})
	}

	function skip(): void {
		for (const handle of active.current.run?.handles ?? []) handle.skip()
	}

	function cancel(): void {
		stopRun(active.current.run)
		active.current.run = null
		setPerRacer(initialRaceState(racers, itemsTotal))
		setElapsedMs(0)
		setStatus(RACE_STATUS.idle)
	}

	return { status, racers, perRacer, elapsedMs, start, skip, cancel }
}
```

- [ ] **Step 10: Run the hook tests**

Run: `corepack pnpm exec vitest run src/features/race/`
Expected: PASS. If a test about timing is off by one tick, fix the code, not the expectation, unless the expectation contradicts `replaySource`'s documented behavior.

- [ ] **Step 11: Lint, typecheck, format, commit**

Run `corepack pnpm lint`, `corepack pnpm typecheck`, `corepack pnpm format:check`.

```bash
git add src/lib/constants.ts src/features/race/race-state.ts src/features/race/race-state.test.ts src/features/race/use-race.ts src/features/race/use-race.test.ts src/features/race/testing/recordings.ts
git commit -m "feat(race): add useRace over recorded replays"
```

---

### Task 2: Racer identity, ModeLabel and Scoreboard

**Files:**

- Modify: `src/components/ui/icons.tsx` (add `BrainIcon`, `CodeIcon`, `PlayIcon`, `SkipIcon`, `WrongIcon`)
- Create: `src/features/race/format.ts`, `src/features/race/racer-names.ts`, `src/features/race/racer-style.ts`
- Create: `src/features/race/racer-tag.tsx`, `src/features/race/mode-label.tsx`, `src/features/race/scoreboard.tsx`
- Test: `src/features/race/format.test.ts`, `src/features/race/racer-names.test.ts`, `src/features/race/racer-tag.test.tsx`, `src/features/race/mode-label.test.tsx`, `src/features/race/scoreboard.test.tsx`

**Interfaces:**

- Consumes: `RunTotals`, `Racer`, `RACERS`, `CLAUDE_MODELS`, fixtures from Task 1.
- Produces:
  - `formatDuration(ms: number): string`, `formatCost(costUsd: number | null): string`, `formatAccuracy(accuracy: number | null): string`, `recordedOn(iso: string): string`, `PRICE_UNKNOWN`, `NOT_SCORED`
  - `MODEL_NAMES: Readonly<Record<string, string>>`, `racerName(racer: Racer, modelId?: string): string`
  - `RACER_STYLE: Record<Racer, { icons: ((props: IconProps) => React.JSX.Element)[]; text: string; fill: string }>`
  - `<RacerTag racer modelId? className? />`
  - `<ModeLabel modelId recordedAt className? />` renders exactly `Beginner mode - recorded <YYYY-MM-DD> - <modelId>`
  - `type ScoreboardRow = { racer: Racer; modelId: string; recordedAt: string; totals: RunTotals }`, `<Scoreboard rows caption />`

- [ ] **Step 1: Add the icons**

In `src/components/ui/icons.tsx`, add `Brain`, `BracketsCurly`, `FastForward`, `Play` and `XCircle` to the alphabetical phosphor import, and add these export lines in alphabetical order among the others:

```tsx
export const BrainIcon = (props: IconProps) => <Glyph source={Brain} {...props} />
export const CodeIcon = (props: IconProps) => <Glyph source={BracketsCurly} {...props} />
export const PlayIcon = (props: IconProps) => <Glyph source={Play} {...props} />
export const SkipIcon = (props: IconProps) => <Glyph source={FastForward} {...props} />
export const WrongIcon = (props: IconProps) => <Glyph source={XCircle} {...props} />
```

- [ ] **Step 2: Write the failing tests for format and names**

`src/features/race/format.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { formatAccuracy, formatCost, formatDuration, recordedOn } from './format'

describe('format', () => {
	it('shows durations under a second in ms and longer ones in seconds', () => {
		expect(formatDuration(0)).toBe('0 ms')
		expect(formatDuration(87.6)).toBe('88 ms')
		expect(formatDuration(1000)).toBe('1.0 s')
		expect(formatDuration(48_250)).toBe('48.3 s')
	})

	it('shows cost in dollars with three significant digits, or price unknown', () => {
		expect(formatCost(0)).toBe('$0')
		expect(formatCost(0.00000252)).toBe('$0.00000252')
		expect(formatCost(0.4312)).toBe('$0.431')
		expect(formatCost(null)).toBe('price unknown')
	})

	it('shows accuracy as a whole percent, or not scored', () => {
		expect(formatAccuracy(1)).toBe('100%')
		expect(formatAccuracy(0.925)).toBe('93%')
		expect(formatAccuracy(null)).toBe('not scored')
	})

	it('takes the date part of a recording time', () => {
		expect(recordedOn('2026-10-02T10:00:00.000Z')).toBe('2026-10-02')
	})
})
```

`src/features/race/racer-names.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { racerName } from './racer-names'

describe('racerName', () => {
	it('names Jev, Code and Jev + Code', () => {
		expect(racerName('jev')).toBe('Jev')
		expect(racerName('code')).toBe('Code')
		expect(racerName('jev_code')).toBe('Jev + Code')
	})

	it('names an LLM by its model, falling back to the model id, then to LLM', () => {
		expect(racerName('llm', 'claude-opus-5-5')).toBe('Claude Opus 5.5')
		expect(racerName('llm', 'claude-sonnet-5-5')).toBe('Claude Sonnet 5.5')
		expect(racerName('llm', 'claude-haiku-4-5-20251001')).toBe('Claude Haiku 4.5')
		expect(racerName('llm', 'gpt-9')).toBe('gpt-9')
		expect(racerName('llm')).toBe('LLM')
	})
})
```

- [ ] **Step 3: Run them to see them fail**

Run: `corepack pnpm exec vitest run src/features/race/format.test.ts src/features/race/racer-names.test.ts`
Expected: FAIL, modules missing.

- [ ] **Step 4: Implement format and names**

`src/features/race/format.ts`:

```ts
// How race numbers read on screen. Views format runner numbers; they never compute them.

const MS_PER_SECOND = 1000
const PERCENT = 100
const COST_SIGNIFICANT_DIGITS = 3
// recordedAt is an ISO datetime; the date part is what we show.
const DATE_LENGTH = 'YYYY-MM-DD'.length

export const PRICE_UNKNOWN = 'price unknown'
export const NOT_SCORED = 'not scored'

const usd = new Intl.NumberFormat('en-US', {
	style: 'currency',
	currency: 'USD',
	maximumSignificantDigits: COST_SIGNIFICANT_DIGITS
})

export function formatDuration(ms: number): string {
	if (ms < MS_PER_SECOND) return `${Math.round(ms)} ms`
	return `${(ms / MS_PER_SECOND).toFixed(1)} s`
}

export function formatCost(costUsd: number | null): string {
	return costUsd === null ? PRICE_UNKNOWN : usd.format(costUsd)
}

export function formatAccuracy(accuracy: number | null): string {
	return accuracy === null ? NOT_SCORED : `${Math.round(accuracy * PERCENT)}%`
}

export function recordedOn(iso: string): string {
	return iso.slice(0, DATE_LENGTH)
}
```

`src/features/race/racer-names.ts`:

```ts
import { CLAUDE_MODELS, RACERS, type Racer } from '@/lib/constants'

// Display names for the models Beginner mode records (spec 3.2). Any other
// model shows its id.
export const MODEL_NAMES: Readonly<Record<string, string>> = {
	[CLAUDE_MODELS.opus]: 'Claude Opus 5.5',
	[CLAUDE_MODELS.sonnet]: 'Claude Sonnet 5.5',
	[CLAUDE_MODELS.haiku]: 'Claude Haiku 4.5'
}

const LLM_NAME = 'LLM'

const RACER_NAMES: Record<Exclude<Racer, typeof RACERS.llm>, string> = {
	[RACERS.jev]: 'Jev',
	[RACERS.code]: 'Code',
	[RACERS.jevCode]: 'Jev + Code'
}

/** A racer's name. An LLM shows its model's name, else its model id, else "LLM". */
export function racerName(racer: Racer, modelId?: string): string {
	if (racer !== RACERS.llm) return RACER_NAMES[racer]
	if (!modelId) return LLM_NAME
	return MODEL_NAMES[modelId] ?? modelId
}
```

- [ ] **Step 5: Run the tests**

Run: `corepack pnpm exec vitest run src/features/race/format.test.ts src/features/race/racer-names.test.ts`
Expected: PASS.

- [ ] **Step 6: Write the failing component tests**

`src/features/race/racer-tag.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { RacerTag } from './racer-tag'

describe('RacerTag', () => {
	it('always shows the racer name as text next to a hidden icon', () => {
		const { container } = render(<RacerTag racer="llm" modelId="claude-opus-5-5" />)
		expect(screen.getByText('Claude Opus 5.5')).toBeInTheDocument()
		const icons = container.querySelectorAll('svg')
		expect(icons.length).toBeGreaterThan(0)
		for (const icon of icons) expect(icon).toHaveAttribute('aria-hidden', 'true')
	})

	it('shows two icons for Jev + Code', () => {
		const { container } = render(<RacerTag racer="jev_code" />)
		expect(screen.getByText('Jev + Code')).toBeInTheDocument()
		expect(container.querySelectorAll('svg')).toHaveLength(2)
	})
})
```

`src/features/race/mode-label.test.tsx`:

```tsx
import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ModeLabel } from './mode-label'

describe('ModeLabel', () => {
	it('names the mode, the recording date and the model id (R6, R84)', () => {
		const { container } = render(
			<ModeLabel modelId="claude-opus-5-5" recordedAt="2026-10-02T10:00:00.000Z" />
		)
		expect(container).toHaveTextContent('Beginner mode - recorded 2026-10-02 - claude-opus-5-5')
	})
})
```

`src/features/race/scoreboard.test.tsx`:

```tsx
import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { jevRecording, opusRecording } from './testing/recordings'
import { Scoreboard } from './scoreboard'

const rows = [
	{
		racer: 'jev' as const,
		modelId: jevRecording.modelId,
		recordedAt: jevRecording.recordedAt,
		totals: jevRecording.totals
	},
	{
		racer: 'llm' as const,
		modelId: opusRecording.modelId,
		recordedAt: opusRecording.recordedAt,
		totals: opusRecording.totals
	}
]

describe('Scoreboard', () => {
	it('shows accuracy, time, cost and parse failures per racer', () => {
		render(<Scoreboard rows={rows} caption="Final numbers" />)
		const table = screen.getByRole('table', { name: 'Final numbers' })
		const opus = within(table).getByRole('row', { name: /Claude Opus 5.5/ })
		expect(opus).toHaveTextContent('50% (1 of 2)')
		expect(opus).toHaveTextContent('1.1 s')
		expect(opus).toHaveTextContent('$0.0024')
		expect(opus).toHaveTextContent('1')
		expect(opus).toHaveTextContent('Beginner mode - recorded 2026-10-02 - claude-opus-5-5')
		const jev = within(table).getByRole('row', { name: /Jev/ })
		expect(jev).toHaveTextContent('100% (2 of 2)')
		expect(jev).toHaveTextContent('120 ms')
	})

	it('says price unknown and not scored instead of inventing numbers', () => {
		const unknown = {
			...rows[1],
			racer: 'llm' as const,
			totals: { ...opusRecording.totals, costUsd: null, accuracy: null, scored: 0, correct: 0 }
		}
		render(<Scoreboard rows={[unknown]} caption="Numbers" />)
		expect(screen.getByText('price unknown')).toBeInTheDocument()
		expect(screen.getByText('not scored')).toBeInTheDocument()
	})
})
```

- [ ] **Step 7: Run them to see them fail**

Run: `corepack pnpm exec vitest run src/features/race/racer-tag.test.tsx src/features/race/mode-label.test.tsx src/features/race/scoreboard.test.tsx`
Expected: FAIL, modules missing.

- [ ] **Step 8: Implement the components**

`src/features/race/racer-style.ts`:

```ts
import { BrainIcon, CodeIcon, LightningIcon, type IconProps } from '@/components/ui/icons'
import { RACERS, type Racer } from '@/lib/constants'

type RacerStyle = {
	icons: ((props: IconProps) => React.JSX.Element)[]
	// Racer colors are 3:1, so they color icons and fills, never body text.
	text: string
	fill: string
}

// One color and one icon per racer, used everywhere (DESIGN 13.2, R72).
export const RACER_STYLE: Record<Racer, RacerStyle> = {
	[RACERS.jev]: { icons: [LightningIcon], text: 'text-jev', fill: 'bg-jev' },
	[RACERS.llm]: { icons: [BrainIcon], text: 'text-llm', fill: 'bg-llm' },
	[RACERS.code]: { icons: [CodeIcon], text: 'text-code', fill: 'bg-code' },
	[RACERS.jevCode]: { icons: [LightningIcon, CodeIcon], text: 'text-jev', fill: 'bg-jev' }
}
```

`src/features/race/racer-tag.tsx`:

```tsx
import { cn } from '@/lib/cn'
import type { Racer } from '@/lib/constants'
import { racerName } from './racer-names'
import { RACER_STYLE } from './racer-style'

const ICON_SIZE = 18

/** The only way to render a racer's name: its icon in its color, always with the name (DESIGN 13.2). */
export function RacerTag({
	racer,
	modelId,
	className
}: {
	racer: Racer
	modelId?: string
	className?: string
}) {
	const style = RACER_STYLE[racer]
	return (
		<span className={cn('inline-flex items-center gap-1.5 font-bold', className)}>
			<span className={cn('inline-flex', style.text)}>
				{style.icons.map((Icon, index) => (
					<Icon key={index} size={ICON_SIZE} />
				))}
			</span>
			<span className="text-text">{racerName(racer, modelId)}</span>
		</span>
	)
}
```

`src/features/race/mode-label.tsx`:

```tsx
import { cn } from '@/lib/cn'
import { recordedOn } from './format'

/** "Beginner mode - recorded <date> - <model id>" on every recorded result (R6, R84). Slice 8 adds Developer mode. */
export function ModeLabel({
	modelId,
	recordedAt,
	className
}: {
	modelId: string
	recordedAt: string
	className?: string
}) {
	return (
		<p className={cn('text-text-muted text-xs break-all', className)}>
			Beginner mode - recorded {recordedOn(recordedAt)} - {modelId}
		</p>
	)
}
```

`src/features/race/scoreboard.tsx`:

```tsx
import type { Racer } from '@/lib/constants'
import type { RunTotals } from '@/runner/types'
import { formatAccuracy, formatCost, formatDuration } from './format'
import { ModeLabel } from './mode-label'
import { RacerTag } from './racer-tag'

export type ScoreboardRow = { racer: Racer; modelId: string; recordedAt: string; totals: RunTotals }

const HEAD_CELL = 'text-text border-border border-b py-2 pr-4 font-bold'
const CELL = 'border-border text-text border-b py-2 pr-4 tabular-nums'

/** Accuracy, time and cost per racer, straight from the runner's totals (DESIGN 3.3). */
export function Scoreboard({ rows, caption }: { rows: ScoreboardRow[]; caption: string }) {
	return (
		<div className="overflow-x-auto">
			<table className="w-full text-left text-sm">
				<caption className="text-text-muted pb-2 text-left text-sm">{caption}</caption>
				<thead>
					<tr>
						<th scope="col" className={HEAD_CELL}>
							Racer
						</th>
						<th scope="col" className={HEAD_CELL}>
							Accuracy
						</th>
						<th scope="col" className={HEAD_CELL}>
							Time
						</th>
						<th scope="col" className={HEAD_CELL}>
							Cost
						</th>
						<th scope="col" className={HEAD_CELL}>
							Couldn&apos;t parse
						</th>
					</tr>
				</thead>
				<tbody>
					{rows.map(({ racer, modelId, recordedAt, totals }) => (
						<tr key={`${racer}-${modelId}`}>
							<th scope="row" className={`${CELL} font-normal`}>
								<RacerTag racer={racer} modelId={modelId} />
								<ModeLabel modelId={modelId} recordedAt={recordedAt} />
							</th>
							<td className={CELL}>
								{totals.accuracy === null
									? formatAccuracy(null)
									: `${formatAccuracy(totals.accuracy)} (${totals.correct} of ${totals.scored})`}
							</td>
							<td className={CELL}>{formatDuration(totals.wallMs)}</td>
							<td className={CELL}>{formatCost(totals.costUsd)}</td>
							<td className={CELL}>{totals.parseFailures}</td>
						</tr>
					))}
				</tbody>
			</table>
		</div>
	)
}
```

- [ ] **Step 9: Run the tests**

Run: `corepack pnpm exec vitest run src/features/race/`
Expected: PASS.

- [ ] **Step 10: Lint, typecheck, format, commit**

```bash
git add src/components/ui/icons.tsx src/features/race/format.ts src/features/race/format.test.ts src/features/race/racer-names.ts src/features/race/racer-names.test.ts src/features/race/racer-style.ts src/features/race/racer-tag.tsx src/features/race/racer-tag.test.tsx src/features/race/mode-label.tsx src/features/race/mode-label.test.tsx src/features/race/scoreboard.tsx src/features/race/scoreboard.test.tsx
git commit -m "feat(race): add racer tags, the mode label and the scoreboard"
```

---

### Task 3: Race view, opponent picker and RaceStage

**Files:**

- Create: `src/components/ui/popover.tsx`
- Create: `src/features/race/race-track.tsx`, `src/features/race/race-view.tsx`, `src/features/race/opponent-picker.tsx`, `src/features/race/race-stage.tsx`
- Test: `src/features/race/race-view.test.tsx`, `src/features/race/opponent-picker.test.tsx`, `src/features/race/race-stage.test.tsx`

**Interfaces:**

- Consumes: Task 1 (`useRace`, `RaceEntry`, `RacerState`, `racerTimeMs`, `RACE_STATUS`, fixtures), Task 2 (`RacerTag`, `ModeLabel`, `Scoreboard`, `ScoreboardRow`, `RACER_STYLE`, `racerName`, `formatDuration`, `formatCost`, icons `PlayIcon`, `SkipIcon`, `ChevronDownIcon`), `Button`, `RACE_LANES`.
- Produces:
  - `Popover`, `PopoverTrigger`, `PopoverContent` (`src/components/ui/popover.tsx`)
  - `type RaceTrackData = { racer: Racer; modelId: string; recordedAt: string; state: RacerState }`
  - `<RaceView tracks status elapsedMs lanes onStart onSkip />`
  - `<OpponentPicker value options onChange />` where `options: string[]` are model ids
  - `<RaceStage task jev opponent />` with `jev: Recording`, `opponent: Recording`

- [ ] **Step 1: Add the Popover primitive**

`src/components/ui/popover.tsx`:

```tsx
'use client'

import * as PopoverPrimitive from '@radix-ui/react-popover'
import { cn } from '@/lib/cn'

// Radix handles focus, Esc to close and outside clicks (docs/rules/components.md).
export const Popover = PopoverPrimitive.Root
export const PopoverTrigger = PopoverPrimitive.Trigger

const POPOVER_OFFSET = 6

export function PopoverContent({
	className,
	align = 'start',
	...props
}: React.ComponentProps<typeof PopoverPrimitive.Content>) {
	return (
		<PopoverPrimitive.Portal>
			<PopoverPrimitive.Content
				align={align}
				sideOffset={POPOVER_OFFSET}
				className={cn(
					'border-border bg-surface text-text z-50 rounded-lg border p-3 shadow-md focus-visible:outline-none',
					className
				)}
				{...props}
			/>
		</PopoverPrimitive.Portal>
	)
}
```

- [ ] **Step 2: Write the failing view tests**

`src/features/race/race-view.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { initialRaceState, raceReducer } from './race-state'
import { RaceView, type RaceTrackData } from './race-view'
import { jevRecording, opusRecording } from './testing/recordings'

function tracks(finished: boolean): RaceTrackData[] {
	let state = initialRaceState(['jev', 'llm'], 3)
	if (finished) {
		state = raceReducer(state, {
			type: 'run_finished',
			racer: 'jev',
			atMs: 120,
			totals: jevRecording.totals
		})
		state = raceReducer(state, {
			type: 'run_finished',
			racer: 'llm',
			atMs: 1100,
			totals: opusRecording.totals
		})
	}
	const jev = state.jev
	const llm = state.llm
	if (!jev || !llm) throw new Error('missing racer')
	return [
		{
			racer: 'jev',
			modelId: jevRecording.modelId,
			recordedAt: jevRecording.recordedAt,
			state: jev
		},
		{
			racer: 'llm',
			modelId: opusRecording.modelId,
			recordedAt: opusRecording.recordedAt,
			state: llm
		}
	]
}

const noop = () => undefined

describe('RaceView', () => {
	it('offers Start when idle and labels every racer with its mode label', async () => {
		const onStart = vi.fn()
		render(
			<RaceView
				tracks={tracks(false)}
				status="idle"
				elapsedMs={0}
				lanes={4}
				onStart={onStart}
				onSkip={noop}
			/>
		)
		expect(screen.getByText('Jev')).toBeInTheDocument()
		expect(screen.getByText('Claude Opus 5.5')).toBeInTheDocument()
		expect(
			screen.getByText('Beginner mode - recorded 2026-10-02 - claude-opus-5-5')
		).toBeInTheDocument()
		await userEvent.click(screen.getByRole('button', { name: 'Start the race' }))
		expect(onStart).toHaveBeenCalledOnce()
	})

	it('offers Skip to result while running and shows progress per racer', async () => {
		const onSkip = vi.fn()
		render(
			<RaceView
				tracks={tracks(false)}
				status="running"
				elapsedMs={250}
				lanes={4}
				onStart={noop}
				onSkip={onSkip}
			/>
		)
		const bars = screen.getAllByRole('progressbar')
		expect(bars).toHaveLength(2)
		expect(bars[0]).toHaveAttribute('aria-valuenow', '0')
		expect(bars[0]).toHaveAttribute('aria-valuemax', '3')
		expect(screen.getByRole('status')).toHaveTextContent('Racing')
		await userEvent.click(screen.getByRole('button', { name: 'Skip to result' }))
		expect(onSkip).toHaveBeenCalledOnce()
	})

	it('shows the scoreboard with the recorded totals once finished', () => {
		render(
			<RaceView
				tracks={tracks(true)}
				status="finished"
				elapsedMs={1100}
				lanes={4}
				onStart={noop}
				onSkip={noop}
			/>
		)
		expect(screen.getByRole('table', { name: /Final numbers/ })).toBeInTheDocument()
		expect(screen.getByRole('button', { name: 'Race again' })).toBeInTheDocument()
		expect(screen.getByRole('status')).toHaveTextContent('Finished')
	})
})
```

`src/features/race/opponent-picker.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { OpponentPicker } from './opponent-picker'

const OPTIONS = ['claude-opus-5-5', 'claude-sonnet-5-5', 'claude-haiku-4-5-20251001']

describe('OpponentPicker', () => {
	it('shows the current opponent and switches to another one', async () => {
		const onChange = vi.fn()
		render(<OpponentPicker value="claude-opus-5-5" options={OPTIONS} onChange={onChange} />)
		await userEvent.click(screen.getByRole('button', { name: /Opponent: Claude Opus 5.5/ }))
		expect(screen.getByRole('radio', { name: 'Claude Opus 5.5' })).toBeChecked()
		await userEvent.click(screen.getByRole('radio', { name: 'Claude Haiku 4.5' }))
		expect(onChange).toHaveBeenCalledWith('claude-haiku-4-5-20251001')
	})
})
```

`src/features/race/race-stage.test.tsx`:

```tsx
import { act, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { choiceTask } from '@/runner/testing/tasks'
import { RaceStage } from './race-stage'
import { jevRecording, opusRecording } from './testing/recordings'

beforeEach(() => vi.useFakeTimers())
afterEach(() => vi.useRealTimers())

describe('RaceStage', () => {
	it('plays Jev against the opponent and lands on the recorded numbers', async () => {
		render(<RaceStage task={choiceTask} jev={jevRecording} opponent={opusRecording} />)
		act(() => screen.getByRole('button', { name: 'Start the race' }).click())
		await act(async () => {
			await vi.advanceTimersByTimeAsync(1200)
		})
		expect(screen.getByRole('status')).toHaveTextContent('Finished')
		expect(screen.getByRole('table', { name: /Final numbers/ })).toHaveTextContent('$0.0024')
	})

	it('skips straight to the recorded result', async () => {
		render(<RaceStage task={choiceTask} jev={jevRecording} opponent={opusRecording} />)
		act(() => screen.getByRole('button', { name: 'Start the race' }).click())
		await act(async () => {
			screen.getByRole('button', { name: 'Skip to result' }).click()
		})
		expect(screen.getByRole('status')).toHaveTextContent('Finished')
	})
})
```

- [ ] **Step 3: Run them to see them fail**

Run: `corepack pnpm exec vitest run src/features/race/race-view.test.tsx src/features/race/opponent-picker.test.tsx src/features/race/race-stage.test.tsx`
Expected: FAIL, modules missing.

- [ ] **Step 4: Implement the track and the view**

`src/features/race/race-track.tsx`:

```tsx
'use client'

import { m } from 'motion/react'
import { cn } from '@/lib/cn'
import type { Racer } from '@/lib/constants'
import { formatCost, formatDuration } from './format'
import { ModeLabel } from './mode-label'
import { racerName } from './racer-names'
import { RACER_STYLE } from './racer-style'
import { RacerTag } from './racer-tag'
import { racerTimeMs, type RacerState } from './race-state'

export type RaceTrackData = { racer: Racer; modelId: string; recordedAt: string; state: RacerState }

const PERCENT = 100
const STAT_LABEL = 'text-text-muted text-xs'
const STAT_VALUE = 'text-text text-lg font-bold tabular-nums'

/** One racer's lane: items done, busy lanes, time and cost so far. Numbers come from the runner. */
export function RaceTrack({
	track,
	elapsedMs,
	lanes
}: {
	track: RaceTrackData
	elapsedMs: number
	lanes: number
}) {
	const { racer, modelId, recordedAt, state } = track
	const done = state.results.length
	const totals = state.totals ?? state.progress
	const name = racerName(racer, modelId)
	const fill = RACER_STYLE[racer].fill

	return (
		<div className="bg-surface border-border flex flex-col gap-3 rounded-lg border p-4">
			<div className="flex flex-wrap items-baseline justify-between gap-2">
				<RacerTag racer={racer} modelId={modelId} />
				<ModeLabel modelId={modelId} recordedAt={recordedAt} />
			</div>
			<div
				role="progressbar"
				aria-label={`${name} items done`}
				aria-valuemin={0}
				aria-valuemax={state.itemsTotal}
				aria-valuenow={done}
				className="bg-surface-hover h-3 overflow-hidden rounded-full"
			>
				<m.div
					className={cn('h-full rounded-full', fill)}
					initial={false}
					animate={{ width: `${(done / Math.max(1, state.itemsTotal)) * PERCENT}%` }}
				/>
			</div>
			<div
				className="flex items-center gap-2"
				aria-label={`${state.inFlight} of ${lanes} lanes busy`}
				role="img"
			>
				<span className={STAT_LABEL}>Lanes</span>
				{Array.from({ length: lanes }, (_, lane) => (
					<span
						key={lane}
						className={cn(
							'border-border-strong size-3 rounded-full border',
							lane < state.inFlight && fill
						)}
					/>
				))}
			</div>
			<dl className="grid grid-cols-3 gap-2">
				<div>
					<dt className={STAT_LABEL}>Done</dt>
					<dd className={STAT_VALUE}>
						{done}/{state.itemsTotal}
					</dd>
				</div>
				<div>
					<dt className={STAT_LABEL}>Time</dt>
					<dd className={STAT_VALUE}>{formatDuration(racerTimeMs(state, elapsedMs))}</dd>
				</div>
				<div>
					<dt className={STAT_LABEL}>Cost</dt>
					<dd className={STAT_VALUE}>{formatCost(totals.costUsd)}</dd>
				</div>
			</dl>
		</div>
	)
}
```

Note for `racerTimeMs` while idle: `elapsedMs` is 0, so the clock shows `0 ms`.

`src/features/race/race-view.tsx`:

```tsx
'use client'

import { Button } from '@/components/ui/button'
import { PlayIcon, SkipIcon } from '@/components/ui/icons'
import { RACE_STATUS, type RaceStatus } from '@/lib/constants'
import { RaceTrack, type RaceTrackData } from './race-track'
import { Scoreboard } from './scoreboard'

export type { RaceTrackData } from './race-track'

const STATUS_TEXT: Record<RaceStatus, string> = {
	[RACE_STATUS.idle]: 'Ready when you are.',
	[RACE_STATUS.running]: 'Racing at the recorded speed...',
	[RACE_STATUS.finished]: 'Finished. These are the recorded numbers.'
}

/** The race: one track per racer, Start / Skip to result, and the scoreboard at the end. */
export function RaceView({
	tracks,
	status,
	elapsedMs,
	lanes,
	onStart,
	onSkip
}: {
	tracks: RaceTrackData[]
	status: RaceStatus
	elapsedMs: number
	lanes: number
	onStart: () => void
	onSkip: () => void
}) {
	const finished = status === RACE_STATUS.finished
	return (
		<section aria-label="Race" className="flex flex-col gap-4">
			<div className="flex flex-wrap items-center gap-3">
				{status === RACE_STATUS.running ? (
					<Button type="button" variant="secondary" onClick={onSkip}>
						<SkipIcon />
						Skip to result
					</Button>
				) : (
					<Button type="button" variant={finished ? 'outline' : 'primary'} onClick={onStart}>
						<PlayIcon />
						{finished ? 'Race again' : 'Start the race'}
					</Button>
				)}
				<p role="status" className="text-text-muted text-sm">
					{STATUS_TEXT[status]}
				</p>
			</div>
			<div className="grid gap-4 md:grid-cols-2">
				{tracks.map((track) => (
					<RaceTrack
						key={`${track.racer}-${track.modelId}`}
						track={track}
						elapsedMs={elapsedMs}
						lanes={lanes}
					/>
				))}
			</div>
			{finished && (
				<Scoreboard
					caption="Final numbers from the recordings"
					rows={tracks.flatMap(({ racer, modelId, recordedAt, state }) =>
						state.totals ? [{ racer, modelId, recordedAt, totals: state.totals }] : []
					)}
				/>
			)}
		</section>
	)
}
```

- [ ] **Step 5: Implement the picker and the stage**

`src/features/race/opponent-picker.tsx`:

```tsx
'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { ChevronDownIcon } from '@/components/ui/icons'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { RACERS } from '@/lib/constants'
import { racerName } from './racer-names'
import { RacerTag } from './racer-tag'

/** Picks which recorded LLM Jev races (DESIGN 1: Opus 5.5 by default). */
export function OpponentPicker({
	value,
	options,
	onChange
}: {
	value: string
	options: string[]
	onChange: (modelId: string) => void
}) {
	const [open, setOpen] = useState(false)
	return (
		<Popover open={open} onOpenChange={setOpen}>
			<PopoverTrigger asChild>
				<Button type="button" variant="outline">
					Opponent: {racerName(RACERS.llm, value)}
					<ChevronDownIcon />
				</Button>
			</PopoverTrigger>
			<PopoverContent>
				<fieldset className="flex flex-col gap-2">
					<legend className="text-text-muted mb-1 text-sm">Pick Jev&apos;s opponent</legend>
					{options.map((modelId) => (
						<label
							key={modelId}
							className="hover:bg-surface-hover has-[:focus-visible]:outline-accent flex cursor-pointer items-center gap-2 rounded p-2 has-[:focus-visible]:outline has-[:focus-visible]:outline-2"
						>
							<input
								type="radio"
								name="opponent"
								value={modelId}
								checked={modelId === value}
								onChange={() => {
									onChange(modelId)
									setOpen(false)
								}}
								className="accent-accent"
							/>
							<RacerTag racer={RACERS.llm} modelId={modelId} />
						</label>
					))}
				</fieldset>
			</PopoverContent>
		</Popover>
	)
}
```

The radio's accessible name comes from its `<label>`, whose text is the RacerTag name ("Claude Haiku 4.5").

`src/features/race/race-stage.tsx`:

```tsx
'use client'

import type { Recording } from '@/content/recording-schema'
import type { Task } from '@/content/task-schema'
import { RACE_LANES, RACERS } from '@/lib/constants'
import { RaceView, type RaceTrackData } from './race-view'
import { useRace } from './use-race'

/**
 * Jev against one recorded opponent. Remount it with a new `key` to switch
 * opponents: unmounting aborts the old replay.
 */
export function RaceStage({
	task,
	jev,
	opponent
}: {
	task: Task
	jev: Recording
	opponent: Recording
}) {
	const recordings = [jev, opponent]
	const race = useRace({
		task,
		entries: recordings.map((recording) => ({ racer: recording.racer, recording }))
	})
	// Jev + Code (a combine task) shows Jev's model and recording date.
	const tracks: RaceTrackData[] = race.racers.flatMap((racer) => {
		const state = race.perRacer[racer]
		const source = racer === RACERS.llm ? opponent : jev
		return state ? [{ racer, modelId: source.modelId, recordedAt: source.recordedAt, state }] : []
	})
	return (
		<RaceView
			tracks={tracks}
			status={race.status}
			elapsedMs={race.elapsedMs}
			lanes={RACE_LANES}
			onStart={race.start}
			onSkip={race.skip}
		/>
	)
}
```

- [ ] **Step 6: Run the tests**

Run: `corepack pnpm exec vitest run src/features/race/`
Expected: PASS. Motion's `m.div` renders a plain div in tests (no LazyMotion parent needed).

- [ ] **Step 7: Lint, typecheck, format, commit**

```bash
git add src/components/ui/popover.tsx src/features/race/race-track.tsx src/features/race/race-view.tsx src/features/race/race-view.test.tsx src/features/race/opponent-picker.tsx src/features/race/opponent-picker.test.tsx src/features/race/race-stage.tsx src/features/race/race-stage.test.tsx
git commit -m "feat(race): add the race view, opponent picker and race stage"
```

---

### Task 4: Level schema, registry and prediction judging

**Files:**

- Modify: `src/lib/constants.ts` (append `LEVEL_STEPS`, `LEVEL_STEP_ORDER`, `PREDICTION_METRICS`, `PREDICTION_OUTCOMES`, `ITEM_OUTCOMES`)
- Modify: `src/lib/links.ts` (append `TYPESAFE_DOCS_URL`, `typesafeDocsUrl`)
- Create: `src/content/level-schema.ts`, `src/content/levels.ts`, `src/content/testing/levels.ts`
- Modify: `src/content/registry.test.ts` (level files are imported)
- Create: `src/features/levels/judge.ts`
- Modify: `DESIGN.md` (section 4.1, the `content/levels/<levelId>.json` row only)
- Test: `src/content/level-schema.test.ts`, `src/content/levels.test.ts`, `src/features/levels/judge.test.ts`

**Interfaces:**

- Consumes: `RunTotals`, `RACERS`, `Racer`, `choiceTask` fixture id `test-choice`.
- Produces:
  - Constants: `LEVEL_STEPS = { learn, predict, play, reveal }`, `type LevelStep`, `LEVEL_STEP_ORDER: readonly LevelStep[]`, `PREDICTION_METRICS = { fastest: 'fastest', cheapest: 'cheapest', mostAccurate: 'most_accurate' }`, `type PredictionMetric`, `PREDICTION_OUTCOMES = { right, wrong, tie, unknown, skipped }`, `type PredictionOutcome`, `ITEM_OUTCOMES = { right, wrong, unparsed, failed, unscored }`, `type ItemOutcome`
  - `TYPESAFE_DOCS_URL`, `typesafeDocsUrl(path: string): string`
  - `levelSchema`, `type Level`, `PREDICTABLE_RACERS`, `type PredictedRacer`
  - `buildLevelMap(raw: unknown[], taskIds: ReadonlySet<string>): ReadonlyMap<string, Level>`, `LEVELS`, `getLevel(id: string): Level | undefined`
  - `type Prediction = Partial<Record<PredictionMetric, PredictedRacer>>`, `type Contender = { racer: PredictedRacer; totals: RunTotals }`, `type Verdict = { metric: PredictionMetric; predicted: PredictedRacer | null; winners: PredictedRacer[] | null; outcome: PredictionOutcome }`, `judgePrediction(metric, predicted, contenders): Verdict`
  - Fixture `testLevel` (raw JSON object) for `test-choice`.

- [ ] **Step 1: Add constants and the docs link helper**

Append to `src/lib/constants.ts`:

```ts
// The level loop (spec 6.1, R24). Slice 5 adds the Check step.
export const LEVEL_STEPS = {
	learn: 'learn',
	predict: 'predict',
	play: 'play',
	reveal: 'reveal'
} as const
export type LevelStep = (typeof LEVEL_STEPS)[keyof typeof LEVEL_STEPS]
export const LEVEL_STEP_ORDER: readonly LevelStep[] = [
	LEVEL_STEPS.learn,
	LEVEL_STEPS.predict,
	LEVEL_STEPS.play,
	LEVEL_STEPS.reveal
]

// What a race prediction asks: who finishes first, costs less, gets more right.
export const PREDICTION_METRICS = {
	fastest: 'fastest',
	cheapest: 'cheapest',
	mostAccurate: 'most_accurate'
} as const
export type PredictionMetric = (typeof PREDICTION_METRICS)[keyof typeof PREDICTION_METRICS]

// How Reveal marks one prediction (R25). unknown: a number needed is missing.
export const PREDICTION_OUTCOMES = {
	right: 'right',
	wrong: 'wrong',
	tie: 'tie',
	unknown: 'unknown',
	skipped: 'skipped'
} as const
export type PredictionOutcome = (typeof PREDICTION_OUTCOMES)[keyof typeof PREDICTION_OUTCOMES]

// How one item's result reads in Reveal. unparsed and failed are misses shown with raw text (R44).
export const ITEM_OUTCOMES = {
	right: 'right',
	wrong: 'wrong',
	unparsed: 'unparsed',
	failed: 'failed',
	unscored: 'unscored'
} as const
export type ItemOutcome = (typeof ITEM_OUTCOMES)[keyof typeof ITEM_OUTCOMES]
```

Append to `src/lib/links.ts`:

```ts
// The only external site levels link to for reading (R27, CLAUDE.md > UI rules).
export const TYPESAFE_DOCS_URL = 'https://docs.typesafe.ai'

export function typesafeDocsUrl(path: string): string {
	return `${TYPESAFE_DOCS_URL}${path}`
}
```

- [ ] **Step 2: Write the fixture and the failing schema and registry tests**

`src/content/testing/levels.ts`:

```ts
// A small, valid level over the runner's test-choice task. Not product content (ROADMAP Rule-5).
export const testLevel = {
	id: 'test-level',
	order: 1,
	title: 'Test Race',
	learn: {
		intro: 'Two racers sort the same tickets.',
		compare: [
			{ racer: 'jev', title: 'Jev', points: ['Answers a typed question'] },
			{ racer: 'llm', title: 'An LLM', points: ['Writes its answer as text'] }
		]
	},
	predict: {
		questions: [
			{ metric: 'fastest', prompt: 'Who finishes first?' },
			{ metric: 'cheapest', prompt: 'Who costs less?' },
			{ metric: 'most_accurate', prompt: 'Who gets more right?' }
		]
	},
	taskIds: ['test-choice'],
	reveal: { why: ['Because one answers directly.'] },
	docs: [{ path: '/concepts/system-one', title: 'System One models' }]
}
```

`src/content/level-schema.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { levelSchema } from './level-schema'
import { testLevel } from './testing/levels'

describe('levelSchema', () => {
	it('accepts a valid level', () => {
		expect(levelSchema.parse(testLevel).id).toBe('test-level')
	})

	it('rejects a docs path that is not a path on docs.typesafe.ai', () => {
		const bad = { ...testLevel, docs: [{ path: 'https://example.com/x', title: 'X' }] }
		expect(levelSchema.safeParse(bad).success).toBe(false)
	})

	it('rejects a prediction asked twice', () => {
		const bad = {
			...testLevel,
			predict: { questions: [testLevel.predict.questions[0], testLevel.predict.questions[0]] }
		}
		expect(levelSchema.safeParse(bad).success).toBe(false)
	})

	it('rejects unknown fields', () => {
		expect(levelSchema.safeParse({ ...testLevel, extra: true }).success).toBe(false)
	})
})
```

`src/content/levels.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { buildLevelMap } from './levels'
import { testLevel } from './testing/levels'

const TASK_IDS = new Set(['test-choice'])

describe('buildLevelMap', () => {
	it('parses levels and keys them by id in path order', () => {
		const second = { ...testLevel, id: 'test-second', order: 2 }
		const map = buildLevelMap([second, testLevel], TASK_IDS)
		expect([...map.keys()]).toEqual(['test-level', 'test-second'])
	})

	it('rejects a level whose task does not exist', () => {
		expect(() => buildLevelMap([{ ...testLevel, taskIds: ['missing'] }], TASK_IDS)).toThrow(
			/missing/
		)
	})

	it('rejects duplicate ids and duplicate orders', () => {
		expect(() => buildLevelMap([testLevel, testLevel], TASK_IDS)).toThrow(/Duplicate level id/)
		expect(() => buildLevelMap([testLevel, { ...testLevel, id: 'other' }], TASK_IDS)).toThrow(
			/order/
		)
	})
})
```

Add this test inside the `describe('content registries')` block of `src/content/registry.test.ts`, with `const LEVELS_DIR = join(CONTENT, 'levels')` next to the other directory constants and `import { LEVELS } from './levels'` with the other imports:

```ts
it('imports every level file, keyed by its id', () => {
	const ids = jsonFiles(LEVELS_DIR).map((file) => {
		const parsed: unknown = JSON.parse(readFileSync(join(LEVELS_DIR, file), 'utf8'))
		const id = z.object({ id: z.string() }).parse(parsed).id
		expect(file).toBe(`${id}.json`)
		return id
	})
	expect([...LEVELS.keys()].sort()).toEqual(ids.sort())
})
```

- [ ] **Step 3: Run them to see them fail**

Run: `corepack pnpm exec vitest run src/content/level-schema.test.ts src/content/levels.test.ts`
Expected: FAIL, modules missing.

- [ ] **Step 4: Implement the schema and the registry**

`src/content/level-schema.ts`:

```ts
import { z } from 'zod'
import { PREDICTION_METRICS, RACERS } from '@/lib/constants'

const LEVEL_COUNT = 8
const MAX_LEARN_POINTS = 4
const MIN_COMPARED = 2
const MAX_COMPARED = 3
const MAX_REVEAL_PARAGRAPHS = 3
// A path on docs.typesafe.ai, with an optional #section (spec 2.4).
const DOCS_PATH = /^\/[a-z0-9/_.-]+(#[a-z0-9-]+)?$/

const text = z.string().min(1)

// A race prediction picks one of the two racers that face each other.
export const PREDICTABLE_RACERS = [RACERS.jev, RACERS.llm] as const
export type PredictedRacer = (typeof PREDICTABLE_RACERS)[number]

// content/levels/<levelId>.json (DESIGN 4.1). Slice 5 adds check.
export const levelSchema = z.strictObject({
	id: z.string().regex(/^[a-z0-9-]+$/),
	order: z.number().int().min(1).max(LEVEL_COUNT),
	title: text,
	learn: z.strictObject({
		intro: text,
		compare: z
			.array(
				z.strictObject({
					racer: z.enum([RACERS.jev, RACERS.llm, RACERS.code]),
					title: text,
					points: z.array(text).min(1).max(MAX_LEARN_POINTS)
				})
			)
			.min(MIN_COMPARED)
			.max(MAX_COMPARED)
	}),
	predict: z.strictObject({
		questions: z
			.array(z.strictObject({ metric: z.enum(PREDICTION_METRICS), prompt: text }))
			.min(1)
			.refine(
				(questions) =>
					new Set(questions.map((question) => question.metric)).size === questions.length,
				'Each prediction is asked once'
			)
	}),
	taskIds: z.array(z.string().min(1)).min(1),
	// Words only: Reveal's numbers come from the recordings at render time.
	reveal: z.strictObject({ why: z.array(text).min(1).max(MAX_REVEAL_PARAGRAPHS) }),
	docs: z.array(z.strictObject({ path: z.string().regex(DOCS_PATH), title: text })).min(1)
})
export type Level = z.infer<typeof levelSchema>
```

`src/content/levels.ts`:

```ts
import { levelSchema, type Level } from './level-schema'
import { TASKS } from './tasks'

// Every file in content/levels/ is imported here, so content renders at build
// time (DESIGN 4.1). registry.test.ts fails when a file is missing. Level 1
// lands with the Speed Race recordings.
const RAW_LEVELS: unknown[] = []

/** Parses levels, checks ids, orders and task ids, and keys them by id in path order. */
export function buildLevelMap(
	raw: unknown[],
	taskIds: ReadonlySet<string>
): ReadonlyMap<string, Level> {
	const levels = raw.map((entry) => levelSchema.parse(entry)).sort((a, b) => a.order - b.order)
	const map = new Map<string, Level>()
	const orders = new Set<number>()
	for (const level of levels) {
		if (map.has(level.id)) throw new Error(`Duplicate level id: ${level.id}`)
		if (orders.has(level.order)) throw new Error(`Duplicate level order: ${level.order}`)
		for (const taskId of level.taskIds) {
			if (!taskIds.has(taskId)) throw new Error(`Level ${level.id} uses unknown task ${taskId}`)
		}
		orders.add(level.order)
		map.set(level.id, level)
	}
	return map
}

export const LEVELS: ReadonlyMap<string, Level> = buildLevelMap(RAW_LEVELS, new Set(TASKS.keys()))

export function getLevel(id: string): Level | undefined {
	return LEVELS.get(id)
}
```

- [ ] **Step 5: Run the schema, registry and registry-file tests**

Run: `corepack pnpm exec vitest run src/content/`
Expected: PASS except the one known failure in `registry.test.ts` ("has a current recording ... speed-race"). The new "imports every level file" test passes (no `content/levels/` yet).

- [ ] **Step 6: Write the failing judge tests**

`src/features/levels/judge.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import type { RunTotals } from '@/runner/types'
import { judgePrediction, type Contender } from './judge'

function totals(overrides: Partial<RunTotals>): RunTotals {
	return {
		items: 40,
		scored: 40,
		correct: 36,
		accuracy: 0.9,
		wallMs: 1000,
		costUsd: 0.01,
		inputTokens: 1,
		outputTokens: 1,
		parseFailures: 0,
		...overrides
	}
}

const jevWins: Contender[] = [
	{ racer: 'jev', totals: totals({ wallMs: 2000, costUsd: 0.0001, accuracy: 0.85 }) },
	{ racer: 'llm', totals: totals({ wallMs: 40_000, costUsd: 0.4, accuracy: 0.95 }) }
]

describe('judgePrediction', () => {
	it('marks the fastest, cheapest and most accurate racer', () => {
		expect(judgePrediction('fastest', 'jev', jevWins)).toEqual({
			metric: 'fastest',
			predicted: 'jev',
			winners: ['jev'],
			outcome: 'right'
		})
		expect(judgePrediction('cheapest', 'llm', jevWins).outcome).toBe('wrong')
		expect(judgePrediction('most_accurate', 'llm', jevWins).outcome).toBe('right')
	})

	it('calls equal numbers a tie', () => {
		const even: Contender[] = [
			{ racer: 'jev', totals: totals({ accuracy: 0.9 }) },
			{ racer: 'llm', totals: totals({ accuracy: 0.9 }) }
		]
		expect(judgePrediction('most_accurate', 'jev', even)).toMatchObject({
			winners: ['jev', 'llm'],
			outcome: 'tie'
		})
	})

	it('cannot judge a missing number, such as an unknown price', () => {
		const unknownPrice: Contender[] = [
			jevWins[0],
			{ racer: 'llm', totals: totals({ costUsd: null }) }
		].filter((contender): contender is Contender => contender !== undefined)
		expect(judgePrediction('cheapest', 'jev', unknownPrice)).toMatchObject({
			winners: null,
			outcome: 'unknown'
		})
	})

	it('still shows the winner when no prediction was made', () => {
		expect(judgePrediction('fastest', undefined, jevWins)).toMatchObject({
			predicted: null,
			winners: ['jev'],
			outcome: 'skipped'
		})
	})
})
```

- [ ] **Step 7: Run it to see it fail**

Run: `corepack pnpm exec vitest run src/features/levels/judge.test.ts`
Expected: FAIL, module missing.

- [ ] **Step 8: Implement the judge**

`src/features/levels/judge.ts`:

```ts
import type { PredictedRacer } from '@/content/level-schema'
import {
	PREDICTION_METRICS,
	PREDICTION_OUTCOMES,
	type PredictionMetric,
	type PredictionOutcome
} from '@/lib/constants'
import type { RunTotals } from '@/runner/types'

export type Prediction = Partial<Record<PredictionMetric, PredictedRacer>>
export type Contender = { racer: PredictedRacer; totals: RunTotals }
export type Verdict = {
	metric: PredictionMetric
	predicted: PredictedRacer | null
	// Every racer with the best number; null when a number is missing.
	winners: PredictedRacer[] | null
	outcome: PredictionOutcome
}

// The runner's number each prediction reads, and whether lower wins.
const METRIC_RULES: Record<
	PredictionMetric,
	{ value: (totals: RunTotals) => number | null; lowerWins: boolean }
> = {
	[PREDICTION_METRICS.fastest]: { value: (totals) => totals.wallMs, lowerWins: true },
	[PREDICTION_METRICS.cheapest]: { value: (totals) => totals.costUsd, lowerWins: true },
	[PREDICTION_METRICS.mostAccurate]: { value: (totals) => totals.accuracy, lowerWins: false }
}

function winnersFor(metric: PredictionMetric, contenders: Contender[]): PredictedRacer[] | null {
	const rule = METRIC_RULES[metric]
	const values: { racer: PredictedRacer; value: number }[] = []
	for (const contender of contenders) {
		const value = rule.value(contender.totals)
		if (value === null) return null
		values.push({ racer: contender.racer, value })
	}
	if (values.length === 0) return null
	const numbers = values.map((entry) => entry.value)
	const best = rule.lowerWins ? Math.min(...numbers) : Math.max(...numbers)
	return values.filter((entry) => entry.value === best).map((entry) => entry.racer)
}

/** Compares one prediction with the recorded numbers (R25). It reads the runner's totals; it never computes them. */
export function judgePrediction(
	metric: PredictionMetric,
	predicted: PredictedRacer | undefined,
	contenders: Contender[]
): Verdict {
	const winners = winnersFor(metric, contenders)
	const base = { metric, predicted: predicted ?? null, winners }
	if (!predicted) return { ...base, outcome: PREDICTION_OUTCOMES.skipped }
	if (!winners) return { ...base, outcome: PREDICTION_OUTCOMES.unknown }
	if (winners.length > 1) return { ...base, outcome: PREDICTION_OUTCOMES.tie }
	return {
		...base,
		outcome: winners[0] === predicted ? PREDICTION_OUTCOMES.right : PREDICTION_OUTCOMES.wrong
	}
}
```

- [ ] **Step 9: Update DESIGN 4.1**

In `DESIGN.md` section 4.1, replace the shape cell of the `content/levels/<levelId>.json` row with:

```
`{ id, order, title, learn: { intro, compare: [{ racer, title, points }] }, predict: { questions: [{ metric, prompt }] }, taskIds, reveal: { why: [text] }, docs: [{ path, title }], check: [question] }`; Reveal's numbers come from the recordings, never from this file
```

Then run `corepack pnpm exec prettier --write DESIGN.md` so the table stays aligned. Change nothing else in DESIGN.md.

- [ ] **Step 10: Run the tests, lint, typecheck, format, commit**

Run: `corepack pnpm exec vitest run src/content/ src/features/levels/` (only the known registry failure may fail).

```bash
git add src/lib/constants.ts src/lib/links.ts src/content/level-schema.ts src/content/level-schema.test.ts src/content/levels.ts src/content/levels.test.ts src/content/testing/levels.ts src/content/registry.test.ts src/features/levels/judge.ts src/features/levels/judge.test.ts DESIGN.md
git commit -m "feat(levels): add the level schema, registry and prediction judge"
```

---

### Task 5: Play and Reveal steps

**Files:**

- Create: `src/features/race/answer-text.ts`, `src/features/levels/lineup.ts`, `src/features/levels/use-celebration.ts`
- Create: `src/features/levels/play-step.tsx`, `src/features/levels/reveal-step.tsx`, `src/features/levels/item-results.tsx`, `src/features/levels/prediction-results.tsx`
- Test: `src/features/race/answer-text.test.ts`, `src/features/levels/lineup.test.ts`, `src/features/levels/play-step.test.tsx`, `src/features/levels/reveal-step.test.tsx`

**Interfaces:**

- Consumes: Tasks 1-4 (`RaceStage`, `OpponentPicker`, `Scoreboard`, `ScoreboardRow`, `RacerTag`, `ModeLabel`, `racerName`, `judgePrediction`, `Prediction`, `Verdict`, `Level`, `typesafeDocsUrl`, `ITEM_OUTCOMES`, `PREDICTION_OUTCOMES`, fixtures `jevRecording`, `opusRecording`, `sonnetRecording`, `testLevel`), `jevAnswerSchema` (`src/runner/parse.ts`), icons `SuccessIcon`, `WrongIcon`, `AlertIcon`, `ExternalLinkIcon`, `InfoIcon`.
- Produces:
  - `valueText(value: unknown): string`, `answerText(racer: Racer, result: ItemResult): string | null`, `itemOutcome(result: ItemResult): ItemOutcome`
  - `type Lineup = { jev: Recording | undefined; opponents: Recording[] }`, `raceLineup(recordings: Recording[]): Lineup`, `defaultOpponentId(opponents: Recording[]): string | undefined`
  - `useCelebration(celebrate: boolean): void`
  - `<PlayStep task jev opponents opponentId onOpponentChange onReveal />`
  - `<RevealStep level task jev opponent others prediction onRaceAgain />`

- [ ] **Step 1: Write the failing helper tests**

`src/features/race/answer-text.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { jevRecording, opusRecording } from './testing/recordings'
import { answerText, itemOutcome, valueText } from './answer-text'

const [jevT1, , jevT3] = jevRecording.events
const [opusT1, opusT2, opusT3] = opusRecording.events
if (!jevT1 || !jevT3 || !opusT1 || !opusT2 || !opusT3) throw new Error('fixture events missing')

describe('answerText', () => {
	it("reads Jev's choice and the LLM's answer as plain text", () => {
		expect(answerText('jev', jevT1)).toBe('billing')
		expect(answerText('llm', opusT1)).toBe('billing')
	})

	it('has no answer when the output did not parse', () => {
		expect(answerText('llm', opusT2)).toBeNull()
	})
})

describe('itemOutcome', () => {
	it('separates right, wrong, unparsed, failed and unscored', () => {
		expect(itemOutcome(jevT1)).toBe('right')
		expect(itemOutcome({ ...jevT1, credit: 0, correct: false })).toBe('wrong')
		expect(itemOutcome(opusT2)).toBe('unparsed')
		expect(itemOutcome({ ...opusT2, error: 'rate_limited' })).toBe('failed')
		expect(itemOutcome(opusT3)).toBe('unscored')
	})
})

describe('valueText', () => {
	it('writes labels as plain text', () => {
		expect(valueText('billing')).toBe('billing')
		expect(valueText(true)).toBe('yes')
		expect(valueText(2)).toBe('2')
		expect(valueText([1, 3])).toBe('[1,3]')
	})
})
```

`src/features/levels/lineup.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { jevRecording, opusRecording, sonnetRecording } from '@/features/race/testing/recordings'
import { defaultOpponentId, raceLineup } from './lineup'

describe('raceLineup', () => {
	it('splits Jev from the LLMs and orders the LLMs Opus, Sonnet, Haiku', () => {
		const lineup = raceLineup([sonnetRecording, jevRecording, opusRecording])
		expect(lineup.jev).toBe(jevRecording)
		expect(lineup.opponents.map((recording) => recording.modelId)).toEqual([
			'claude-opus-5-5',
			'claude-sonnet-5-5'
		])
	})

	it('has no Jev and no opponents when nothing is recorded', () => {
		expect(raceLineup([])).toEqual({ jev: undefined, opponents: [] })
	})
})

describe('defaultOpponentId', () => {
	it('defaults to Opus 5.5, else the first recorded LLM', () => {
		expect(defaultOpponentId([sonnetRecording, opusRecording])).toBe('claude-opus-5-5')
		expect(defaultOpponentId([sonnetRecording])).toBe('claude-sonnet-5-5')
		expect(defaultOpponentId([])).toBeUndefined()
	})
})
```

- [ ] **Step 2: Run them to see them fail**

Run: `corepack pnpm exec vitest run src/features/race/answer-text.test.ts src/features/levels/lineup.test.ts`
Expected: FAIL, modules missing.

- [ ] **Step 3: Implement the helpers**

`src/features/race/answer-text.ts`:

```ts
import { z } from 'zod'
import {
	ANSWER_KEY,
	ITEM_OUTCOMES,
	QUESTION_KINDS,
	RACERS,
	type ItemOutcome,
	type Racer
} from '@/lib/constants'
import { jevAnswerSchema } from '@/runner/parse'
import type { ItemResult } from '@/runner/types'

const jevAnswersSchema = z.record(z.string(), jevAnswerSchema)

/** A label or answer as plain text (R86): an option key, yes or no, a number, or JSON for the rest. */
export function valueText(value: unknown): string {
	if (typeof value === 'string') return value
	if (typeof value === 'boolean') return value ? 'yes' : 'no'
	if (typeof value === 'number') return String(value)
	return JSON.stringify(value)
}

/** What a racer answered, as plain text; null when the call failed or the output did not parse (R44). */
export function answerText(racer: Racer, result: ItemResult): string | null {
	if (!result.ok) return null
	if (racer === RACERS.jev) {
		const answers = jevAnswersSchema.safeParse(result.parsed)
		const answer = answers.success ? answers.data[ANSWER_KEY] : undefined
		if (answer?.type === QUESTION_KINDS.choice) return answer.choice
	}
	return valueText(result.parsed)
}

export function itemOutcome(result: ItemResult): ItemOutcome {
	if (result.error !== undefined) return ITEM_OUTCOMES.failed
	if (!result.ok) return ITEM_OUTCOMES.unparsed
	if (result.correct === null) return ITEM_OUTCOMES.unscored
	return result.correct ? ITEM_OUTCOMES.right : ITEM_OUTCOMES.wrong
}
```

`src/features/levels/lineup.ts`:

```ts
import type { Recording } from '@/content/recording-schema'
import { CLAUDE_MODELS, DEFAULT_OPPONENT, RACERS } from '@/lib/constants'

export type Lineup = { jev: Recording | undefined; opponents: Recording[] }

// Opus, Sonnet, Haiku; any other model after them by id.
const MODEL_ORDER: readonly string[] = Object.values(CLAUDE_MODELS)

function modelRank(modelId: string): number {
	const index = MODEL_ORDER.indexOf(modelId)
	return index === -1 ? MODEL_ORDER.length : index
}

/** Jev's recording and the LLM recordings Jev can race, in picker order. */
export function raceLineup(recordings: Recording[]): Lineup {
	return {
		jev: recordings.find((recording) => recording.racer === RACERS.jev),
		opponents: recordings
			.filter((recording) => recording.racer === RACERS.llm)
			.sort(
				(a, b) => modelRank(a.modelId) - modelRank(b.modelId) || a.modelId.localeCompare(b.modelId)
			)
	}
}

/** Jev faces Opus 5.5 by default (DESIGN 1), else the first recorded LLM. */
export function defaultOpponentId(opponents: Recording[]): string | undefined {
	return (
		opponents.find((recording) => recording.modelId === DEFAULT_OPPONENT)?.modelId ??
		opponents[0]?.modelId
	)
}
```

`src/features/levels/use-celebration.ts`:

```ts
'use client'

import { useEffect } from 'react'

const CONFETTI_PARTICLES = 120
const CONFETTI_SPREAD = 70

/** One burst of confetti when the view mounts with something to celebrate (R68). Skipped under reduced motion (R91). */
export function useCelebration(celebrate: boolean): void {
	useEffect(() => {
		if (!celebrate) return
		let cancelled = false
		void import('canvas-confetti').then(({ default: confetti }) => {
			if (cancelled) return
			void confetti({
				particleCount: CONFETTI_PARTICLES,
				spread: CONFETTI_SPREAD,
				disableForReducedMotion: true
			})
		})
		return () => {
			cancelled = true
		}
	}, [celebrate])
}
```

- [ ] **Step 4: Run the helper tests**

Run: `corepack pnpm exec vitest run src/features/race/answer-text.test.ts src/features/levels/lineup.test.ts`
Expected: PASS.

- [ ] **Step 5: Write the failing step tests**

`src/features/levels/play-step.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { jevRecording, opusRecording, sonnetRecording } from '@/features/race/testing/recordings'
import { choiceTask } from '@/runner/testing/tasks'
import { PlayStep } from './play-step'

describe('PlayStep', () => {
	it('races Jev against the picked opponent and moves on to Reveal', async () => {
		const onReveal = vi.fn()
		const onOpponentChange = vi.fn()
		render(
			<PlayStep
				task={choiceTask}
				jev={jevRecording}
				opponents={[opusRecording, sonnetRecording]}
				opponentId="claude-opus-5-5"
				onOpponentChange={onOpponentChange}
				onReveal={onReveal}
			/>
		)
		expect(screen.getByRole('button', { name: 'Start the race' })).toBeInTheDocument()
		expect(screen.getByRole('button', { name: /Opponent: Claude Opus 5.5/ })).toBeInTheDocument()
		await userEvent.click(screen.getByRole('button', { name: 'See the result' }))
		expect(onReveal).toHaveBeenCalledOnce()
	})

	it('says so plainly when the race has not been recorded', () => {
		render(
			<PlayStep
				task={choiceTask}
				jev={undefined}
				opponents={[]}
				opponentId={undefined}
				onOpponentChange={() => undefined}
				onReveal={() => undefined}
			/>
		)
		expect(screen.getByText(/has not been recorded yet/)).toBeInTheDocument()
		expect(screen.queryByRole('button', { name: 'Start the race' })).not.toBeInTheDocument()
	})
})
```

`src/features/levels/reveal-step.test.tsx`:

```tsx
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { levelSchema } from '@/content/level-schema'
import { testLevel } from '@/content/testing/levels'
import { jevRecording, opusRecording, sonnetRecording } from '@/features/race/testing/recordings'
import { choiceTask } from '@/runner/testing/tasks'
import { RevealStep } from './reveal-step'

vi.mock('canvas-confetti', () => ({ default: vi.fn() }))

const level = levelSchema.parse(testLevel)

function renderReveal(prediction = {}) {
	return render(
		<RevealStep
			level={level}
			task={choiceTask}
			jev={jevRecording}
			opponent={opusRecording}
			others={[sonnetRecording]}
			prediction={prediction}
			onRaceAgain={() => undefined}
		/>
	)
}

describe('RevealStep', () => {
	it('marks each prediction against the recorded numbers', () => {
		renderReveal({ fastest: 'jev', cheapest: 'llm', most_accurate: 'jev' })
		const results = screen.getByRole('list', { name: 'Your prediction' })
		const items = within(results).getAllByRole('listitem')
		expect(items[0]).toHaveTextContent('Who finishes first?')
		expect(items[0]).toHaveTextContent('You got it')
		expect(items[1]).toHaveTextContent('Not this time')
		expect(items[2]).toHaveTextContent('You got it')
	})

	it('says when no prediction was made', () => {
		renderReveal()
		expect(screen.getAllByText('No prediction')).toHaveLength(3)
	})

	it('shows every recorded model with its numbers, the why and the docs link', () => {
		renderReveal()
		const table = screen.getByRole('table')
		expect(within(table).getByRole('row', { name: /Claude Sonnet 5.5/ })).toBeInTheDocument()
		expect(screen.getByText('Because one answers directly.')).toBeInTheDocument()
		expect(screen.getByRole('link', { name: /System One models/ })).toHaveAttribute(
			'href',
			'https://docs.typesafe.ai/concepts/system-one'
		)
	})

	it("shows every item, with a couldn't parse note and the raw output for misses (R44)", async () => {
		renderReveal()
		await userEvent.click(screen.getByText('See every item'))
		// Opus and Sonnet (a copy of Opus's events) both failed to parse t2.
		expect(screen.getAllByText("Couldn't parse")).toHaveLength(2)
		expect(screen.getAllByText('Sure! It is technical.')).toHaveLength(2)
	})

	it('waits for recordings before showing results', () => {
		render(
			<RevealStep
				level={level}
				task={choiceTask}
				jev={undefined}
				opponent={undefined}
				others={[]}
				prediction={{}}
				onRaceAgain={() => undefined}
			/>
		)
		expect(screen.getByText(/once this race is recorded/)).toBeInTheDocument()
	})
})
```

- [ ] **Step 6: Run them to see them fail**

Run: `corepack pnpm exec vitest run src/features/levels/play-step.test.tsx src/features/levels/reveal-step.test.tsx`
Expected: FAIL, modules missing.

- [ ] **Step 7: Implement Play**

`src/features/levels/play-step.tsx`:

```tsx
'use client'

import { Button } from '@/components/ui/button'
import { ArrowRightIcon, InfoIcon } from '@/components/ui/icons'
import type { Recording } from '@/content/recording-schema'
import type { Task } from '@/content/task-schema'
import { OpponentPicker } from '@/features/race/opponent-picker'
import { RaceStage } from '@/features/race/race-stage'

export function NotRecorded({ children }: { children: React.ReactNode }) {
	return (
		<p className="bg-surface border-border text-text flex items-center gap-2 rounded-lg border p-4">
			<InfoIcon />
			{children}
		</p>
	)
}

/** Play: Jev races the picked opponent from the recordings (spec 6.1). */
export function PlayStep({
	task,
	jev,
	opponents,
	opponentId,
	onOpponentChange,
	onReveal
}: {
	task: Task
	jev: Recording | undefined
	opponents: Recording[]
	opponentId: string | undefined
	onOpponentChange: (modelId: string) => void
	onReveal: () => void
}) {
	const opponent = opponents.find((recording) => recording.modelId === opponentId)
	if (!jev || !opponent) {
		return (
			<NotRecorded>This race has not been recorded yet, so there is nothing to replay.</NotRecorded>
		)
	}
	return (
		<section aria-labelledby="play-heading" className="flex flex-col gap-4">
			<div className="flex flex-wrap items-center justify-between gap-3">
				<h2 id="play-heading" className="text-text text-2xl font-bold">
					Race
				</h2>
				<OpponentPicker
					value={opponent.modelId}
					options={opponents.map((recording) => recording.modelId)}
					onChange={onOpponentChange}
				/>
			</div>
			<RaceStage key={opponent.modelId} task={task} jev={jev} opponent={opponent} />
			<div>
				<Button type="button" onClick={onReveal}>
					See the result
					<ArrowRightIcon />
				</Button>
			</div>
		</section>
	)
}
```

- [ ] **Step 8: Implement Reveal**

`src/features/levels/prediction-results.tsx`:

```tsx
import { AlertIcon, InfoIcon, SuccessIcon, WrongIcon } from '@/components/ui/icons'
import type { Level } from '@/content/level-schema'
import { RacerTag } from '@/features/race/racer-tag'
import { cn } from '@/lib/cn'
import { PREDICTION_OUTCOMES, RACERS, type PredictionOutcome } from '@/lib/constants'
import type { Verdict } from './judge'

const OUTCOME_COPY: Record<
	PredictionOutcome,
	{ text: string; tone: string; Icon: typeof SuccessIcon }
> = {
	[PREDICTION_OUTCOMES.right]: { text: 'You got it', tone: 'text-success', Icon: SuccessIcon },
	[PREDICTION_OUTCOMES.wrong]: { text: 'Not this time', tone: 'text-danger', Icon: WrongIcon },
	[PREDICTION_OUTCOMES.tie]: { text: "It's a tie", tone: 'text-text-muted', Icon: InfoIcon },
	[PREDICTION_OUTCOMES.unknown]: {
		text: "Can't tell: a number is missing",
		tone: 'text-warning',
		Icon: AlertIcon
	},
	[PREDICTION_OUTCOMES.skipped]: { text: 'No prediction', tone: 'text-text-muted', Icon: InfoIcon }
}

/** Each prediction next to the real result (R25). Icons and words carry the outcome, not color alone (R90). */
export function PredictionResults({
	questions,
	verdicts,
	opponentModelId
}: {
	questions: Level['predict']['questions']
	verdicts: Verdict[]
	opponentModelId: string
}) {
	return (
		<ul aria-label="Your prediction" className="flex flex-col gap-3">
			{questions.map((question, index) => {
				const verdict = verdicts[index]
				if (!verdict) return null
				const copy = OUTCOME_COPY[verdict.outcome]
				return (
					<li
						key={question.metric}
						className="bg-surface border-border flex flex-col gap-2 rounded-lg border p-4"
					>
						<p className="text-text font-bold">{question.prompt}</p>
						<div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
							<span className="text-text-muted">
								You picked{' '}
								{verdict.predicted ? (
									<RacerTag
										racer={verdict.predicted}
										modelId={verdict.predicted === RACERS.llm ? opponentModelId : undefined}
									/>
								) : (
									'nothing'
								)}
							</span>
							<span className="text-text-muted">
								Result:{' '}
								{verdict.winners
									? verdict.winners.map((racer) => (
											<RacerTag
												key={racer}
												racer={racer}
												modelId={racer === RACERS.llm ? opponentModelId : undefined}
												className="mr-2"
											/>
										))
									: 'unknown'}
							</span>
							<span className={cn('inline-flex items-center gap-1 font-bold', copy.tone)}>
								<copy.Icon />
								{copy.text}
							</span>
						</div>
					</li>
				)
			})}
		</ul>
	)
}
```

Note: the "No prediction" text appears in the outcome badge only (the "You picked" text says "nothing"), so the test's `getAllByText('No prediction')` finds exactly 3.

`src/features/levels/item-results.tsx`:

```tsx
import { AlertIcon, SuccessIcon, WrongIcon, InfoIcon } from '@/components/ui/icons'
import type { Recording } from '@/content/recording-schema'
import type { Task } from '@/content/task-schema'
import { answerText, itemOutcome, valueText } from '@/features/race/answer-text'
import { RacerTag } from '@/features/race/racer-tag'
import { cn } from '@/lib/cn'
import { ITEM_OUTCOMES, type ItemOutcome } from '@/lib/constants'
import type { ItemResult } from '@/runner/types'

const OUTCOME_COPY: Record<ItemOutcome, { text: string; tone: string; Icon: typeof SuccessIcon }> =
	{
		[ITEM_OUTCOMES.right]: { text: 'Right', tone: 'text-success', Icon: SuccessIcon },
		[ITEM_OUTCOMES.wrong]: { text: 'Wrong', tone: 'text-danger', Icon: WrongIcon },
		[ITEM_OUTCOMES.unparsed]: { text: "Couldn't parse", tone: 'text-warning', Icon: AlertIcon },
		[ITEM_OUTCOMES.failed]: { text: 'Call failed', tone: 'text-warning', Icon: AlertIcon },
		[ITEM_OUTCOMES.unscored]: { text: 'Not scored', tone: 'text-text-muted', Icon: InfoIcon }
	}

function ResultCell({
	recording,
	result
}: {
	recording: Recording
	result: ItemResult | undefined
}) {
	if (!result) return <p className="text-text-muted text-sm">No result recorded</p>
	const outcome = itemOutcome(result)
	const copy = OUTCOME_COPY[outcome]
	const answer = answerText(recording.racer, result)
	return (
		<div className="flex flex-col gap-1 text-sm">
			<RacerTag racer={recording.racer} modelId={recording.modelId} />
			<p className="text-text">{answer ?? 'No answer'}</p>
			<p className={cn('inline-flex items-center gap-1 font-bold', copy.tone)}>
				<copy.Icon />
				{copy.text}
			</p>
			{answer === null && (
				<p className="bg-surface-hover text-text rounded p-2 font-mono text-xs break-words whitespace-pre-wrap">
					{result.raw}
				</p>
			)}
		</div>
	)
}

/** Every item with each racer's answer. Misses that didn't parse show their raw output (R44), as plain text (R86). */
export function ItemResults({ task, recordings }: { task: Task; recordings: Recording[] }) {
	const byItem = recordings.map(
		(recording) =>
			new Map<string, ItemResult>(recording.events.map((event) => [event.itemId, event]))
	)
	return (
		<details className="bg-surface border-border rounded-lg border p-4">
			<summary className="text-text focus-visible:outline-accent cursor-pointer rounded font-bold focus-visible:outline focus-visible:outline-2">
				See every item
			</summary>
			<ol className="mt-4 flex flex-col gap-4">
				{task.items.map((item, index) => (
					<li key={item.id} className="border-border flex flex-col gap-3 border-t pt-4">
						<p className="text-text">
							<span className="text-text-muted mr-2 font-bold">{index + 1}.</span>
							{valueText(item.state)}
						</p>
						<p className="text-text-muted text-sm">
							Correct answer:{' '}
							<span className="text-text font-bold">
								{item.label === undefined ? 'not scored' : valueText(item.label)}
							</span>
						</p>
						<div className="grid gap-4 sm:grid-cols-2">
							{recordings.map((recording, column) => (
								<ResultCell
									key={recording.modelId}
									recording={recording}
									result={byItem[column]?.get(item.id)}
								/>
							))}
						</div>
					</li>
				))}
			</ol>
		</details>
	)
}
```

`src/features/levels/reveal-step.tsx`:

```tsx
'use client'

import { Button } from '@/components/ui/button'
import { ExternalLinkIcon } from '@/components/ui/icons'
import type { Level } from '@/content/level-schema'
import type { Recording } from '@/content/recording-schema'
import type { Task } from '@/content/task-schema'
import { Scoreboard } from '@/features/race/scoreboard'
import { PREDICTION_OUTCOMES, RACERS } from '@/lib/constants'
import { typesafeDocsUrl } from '@/lib/links'
import { ItemResults } from './item-results'
import { judgePrediction, type Prediction } from './judge'
import { NotRecorded } from './play-step'
import { PredictionResults } from './prediction-results'
import { useCelebration } from './use-celebration'

const SECTION_TITLE = 'text-text text-xl font-bold'

/** Reveal: the prediction against the real result, every model's numbers, why, and the docs (R25-R27). */
export function RevealStep({
	level,
	task,
	jev,
	opponent,
	others,
	prediction,
	onRaceAgain
}: {
	level: Level
	task: Task
	jev: Recording | undefined
	opponent: Recording | undefined
	others: Recording[]
	prediction: Prediction
	onRaceAgain: () => void
}) {
	const verdicts =
		jev && opponent
			? level.predict.questions.map((question) =>
					judgePrediction(question.metric, prediction[question.metric], [
						{ racer: RACERS.jev, totals: jev.totals },
						{ racer: RACERS.llm, totals: opponent.totals }
					])
				)
			: []
	useCelebration(verdicts.some((verdict) => verdict.outcome === PREDICTION_OUTCOMES.right))

	if (!jev || !opponent) {
		return <NotRecorded>The results appear here once this race is recorded.</NotRecorded>
	}
	const recordings = [jev, opponent, ...others]
	return (
		<section aria-labelledby="reveal-heading" className="flex flex-col gap-6">
			<h2 id="reveal-heading" className="text-text text-2xl font-bold">
				What happened
			</h2>
			<PredictionResults
				questions={level.predict.questions}
				verdicts={verdicts}
				opponentModelId={opponent.modelId}
			/>
			<Scoreboard
				caption={`Every recorded model on the same ${task.items.length} items`}
				rows={recordings.map((recording) => ({
					racer: recording.racer,
					modelId: recording.modelId,
					recordedAt: recording.recordedAt,
					totals: recording.totals
				}))}
			/>
			<div className="flex flex-col gap-2">
				<h3 className={SECTION_TITLE}>Why</h3>
				{level.reveal.why.map((paragraph) => (
					<p key={paragraph} className="text-text-muted">
						{paragraph}
					</p>
				))}
			</div>
			<div className="flex flex-col gap-2">
				<h3 className={SECTION_TITLE}>Read more</h3>
				<ul className="flex flex-col gap-1">
					{level.docs.map((doc) => (
						<li key={doc.path}>
							<a
								href={typesafeDocsUrl(doc.path)}
								target="_blank"
								rel="noreferrer"
								className="text-accent focus-visible:outline-accent inline-flex items-center gap-1 rounded underline underline-offset-4 focus-visible:outline focus-visible:outline-2"
							>
								{doc.title} on TypeSafe docs
								<ExternalLinkIcon />
							</a>
						</li>
					))}
				</ul>
			</div>
			<ItemResults task={task} recordings={recordings} />
			<div>
				<Button type="button" variant="outline" onClick={onRaceAgain}>
					Race again
				</Button>
			</div>
		</section>
	)
}
```

The hook `useCelebration` is called before the early return, so hook order never changes.

- [ ] **Step 9: Run the tests**

Run: `corepack pnpm exec vitest run src/features/`
Expected: PASS.

- [ ] **Step 10: Lint, typecheck, format, commit**

```bash
git add src/features/race/answer-text.ts src/features/race/answer-text.test.ts src/features/levels/lineup.ts src/features/levels/lineup.test.ts src/features/levels/use-celebration.ts src/features/levels/play-step.tsx src/features/levels/play-step.test.tsx src/features/levels/reveal-step.tsx src/features/levels/reveal-step.test.tsx src/features/levels/item-results.tsx src/features/levels/prediction-results.tsx
git commit -m "feat(levels): add the play and reveal steps"
```

---

### Task 6: Level stepper with Learn and Predict

**Files:**

- Create: `src/features/levels/use-level-step.ts`, `src/features/levels/stepper-nav.tsx`, `src/features/levels/learn-step.tsx`, `src/features/levels/predict-step.tsx`, `src/features/levels/beginner-banner.tsx`, `src/features/levels/level-skeleton.tsx`, `src/features/levels/level-stepper.tsx`
- Test: `src/features/levels/use-level-step.test.ts`, `src/features/levels/predict-step.test.tsx`, `src/features/levels/level-stepper.test.tsx`

**Interfaces:**

- Consumes: Tasks 1-5 (`PlayStep`, `RevealStep`, `raceLineup`, `defaultOpponentId`, `Prediction`, `Level`, `PredictedRacer`, `PREDICTABLE_RACERS`, `LEVEL_STEPS`, `LEVEL_STEP_ORDER`, `RacerTag`), `next/navigation` (`useSearchParams`, `useRouter`, `usePathname`).
- Produces:
  - `parseStep(value: string | null): LevelStep`, `useLevelStep(): { step: LevelStep; goTo: (step: LevelStep) => void }`
  - `<LevelStepper level task recordings />` (client; must sit under a `<Suspense>` because of `useSearchParams`)
  - `<LevelSkeleton />` (the Suspense fallback)

- [ ] **Step 1: Write the failing tests**

`src/features/levels/use-level-step.test.ts`:

```ts
import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const push = vi.fn()
let search = new URLSearchParams()

vi.mock('next/navigation', () => ({
	useRouter: () => ({ push }),
	usePathname: () => '/levels/test-level',
	useSearchParams: () => search
}))

const { parseStep, useLevelStep } = await import('./use-level-step')

beforeEach(() => {
	push.mockClear()
	search = new URLSearchParams()
})

describe('parseStep', () => {
	it('reads a known step and falls back to Learn', () => {
		expect(parseStep('reveal')).toBe('reveal')
		expect(parseStep('check')).toBe('learn')
		expect(parseStep(null)).toBe('learn')
	})
})

describe('useLevelStep', () => {
	it('reads ?step= and moves with a new history entry', () => {
		search = new URLSearchParams('step=predict')
		const { result } = renderHook(() => useLevelStep())
		expect(result.current.step).toBe('predict')
		act(() => result.current.goTo('play'))
		expect(push).toHaveBeenCalledWith('/levels/test-level?step=play')
	})
})
```

`src/features/levels/predict-step.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { levelSchema } from '@/content/level-schema'
import { testLevel } from '@/content/testing/levels'
import { PredictStep } from './predict-step'

const { questions } = levelSchema.parse(testLevel).predict

describe('PredictStep', () => {
	it('locks in one pick per question with Enter or the button', async () => {
		const onSubmit = vi.fn()
		render(<PredictStep questions={questions} initial={{}} onSubmit={onSubmit} />)
		const submit = screen.getByRole('button', { name: 'Lock in my prediction' })
		expect(submit).toBeDisabled()

		const groups = screen.getAllByRole('group')
		expect(groups).toHaveLength(3)
		await userEvent.click(screen.getAllByRole('radio', { name: 'Jev' })[0] ?? submit)
		await userEvent.click(screen.getAllByRole('radio', { name: 'LLM' })[1] ?? submit)
		await userEvent.click(screen.getAllByRole('radio', { name: 'Jev' })[2] ?? submit)
		await userEvent.click(submit)
		expect(onSubmit).toHaveBeenCalledWith({ fastest: 'jev', cheapest: 'llm', most_accurate: 'jev' })
	})

	it('starts from an earlier prediction', () => {
		render(
			<PredictStep questions={questions} initial={{ fastest: 'llm' }} onSubmit={() => undefined} />
		)
		expect(screen.getAllByRole('radio', { name: 'LLM' })[0]).toBeChecked()
	})
})
```

`src/features/levels/level-stepper.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { levelSchema } from '@/content/level-schema'
import { testLevel } from '@/content/testing/levels'
import { jevRecording, opusRecording } from '@/features/race/testing/recordings'
import { choiceTask } from '@/runner/testing/tasks'

const push = vi.fn()
let search = new URLSearchParams()

vi.mock('next/navigation', () => ({
	useRouter: () => ({ push }),
	usePathname: () => '/levels/test-level',
	useSearchParams: () => search
}))
vi.mock('canvas-confetti', () => ({ default: vi.fn() }))

const { LevelStepper } = await import('./level-stepper')
const level = levelSchema.parse(testLevel)

function renderStepper() {
	return render(
		<LevelStepper level={level} task={choiceTask} recordings={[jevRecording, opusRecording]} />
	)
}

beforeEach(() => {
	push.mockClear()
	search = new URLSearchParams()
})

describe('LevelStepper', () => {
	it('opens on Learn with the level title, the Beginner mode banner and every step', async () => {
		renderStepper()
		expect(screen.getByRole('heading', { level: 1, name: 'Test Race' })).toBeInTheDocument()
		expect(screen.getByText(/replay of real recorded runs/)).toBeInTheDocument()
		const nav = screen.getByRole('navigation', { name: 'Level steps' })
		expect(nav).toHaveTextContent('Learn')
		expect(nav).toHaveTextContent('Reveal')
		expect(screen.getByRole('button', { name: /1\. Learn/ })).toHaveAttribute(
			'aria-current',
			'step'
		)
		expect(screen.getByText('Two racers sort the same tickets.')).toBeInTheDocument()
		await userEvent.click(screen.getByRole('button', { name: 'Make your prediction' }))
		expect(push).toHaveBeenCalledWith('/levels/test-level?step=predict')
	})

	it('lets any step be opened from the step list (no step is locked)', async () => {
		renderStepper()
		await userEvent.click(screen.getByRole('button', { name: /4\. Reveal/ }))
		expect(push).toHaveBeenCalledWith('/levels/test-level?step=reveal')
	})

	it('carries the prediction into Reveal', async () => {
		search = new URLSearchParams('step=predict')
		const { rerender } = renderStepper()
		for (const [index, name] of ['Jev', 'Jev', 'LLM'].entries()) {
			const radio = screen.getAllByRole('radio', { name })[index]
			if (radio) await userEvent.click(radio)
		}
		await userEvent.click(screen.getByRole('button', { name: 'Lock in my prediction' }))
		expect(push).toHaveBeenCalledWith('/levels/test-level?step=play')

		search = new URLSearchParams('step=reveal')
		rerender(
			<LevelStepper level={level} task={choiceTask} recordings={[jevRecording, opusRecording]} />
		)
		expect(screen.getByRole('list', { name: 'Your prediction' })).toHaveTextContent('You got it')
	})
})
```

- [ ] **Step 2: Run them to see them fail**

Run: `corepack pnpm exec vitest run src/features/levels/use-level-step.test.ts src/features/levels/predict-step.test.tsx src/features/levels/level-stepper.test.tsx`
Expected: FAIL, modules missing.

- [ ] **Step 3: Implement the step hook and the small views**

`src/features/levels/use-level-step.ts`:

```ts
'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { LEVEL_STEP_ORDER, LEVEL_STEPS, type LevelStep } from '@/lib/constants'

const STEP_PARAM = 'step'

function isLevelStep(value: string | null): value is LevelStep {
	return LEVEL_STEP_ORDER.some((step) => step === value)
}

export function parseStep(value: string | null): LevelStep {
	return isLevelStep(value) ? value : LEVEL_STEPS.learn
}

/** The current level step lives in ?step= so it survives reloads and the back button (DESIGN 6). */
export function useLevelStep(): { step: LevelStep; goTo: (step: LevelStep) => void } {
	const searchParams = useSearchParams()
	const router = useRouter()
	const pathname = usePathname()
	return {
		step: parseStep(searchParams.get(STEP_PARAM)),
		goTo: (step) => router.push(`${pathname}?${STEP_PARAM}=${step}`)
	}
}
```

`src/features/levels/stepper-nav.tsx`:

```tsx
import { cn } from '@/lib/cn'
import { LEVEL_STEP_ORDER, LEVEL_STEPS, type LevelStep } from '@/lib/constants'

const STEP_LABELS: Record<LevelStep, string> = {
	[LEVEL_STEPS.learn]: 'Learn',
	[LEVEL_STEPS.predict]: 'Predict',
	[LEVEL_STEPS.play]: 'Play',
	[LEVEL_STEPS.reveal]: 'Reveal'
}

/** The level loop as a step list. Every step can be opened; none is locked (R23, R28). */
export function StepperNav({
	current,
	onSelect
}: {
	current: LevelStep
	onSelect: (step: LevelStep) => void
}) {
	return (
		<nav aria-label="Level steps">
			<ol className="grid grid-cols-2 gap-2 sm:grid-cols-4">
				{LEVEL_STEP_ORDER.map((step, index) => {
					const active = step === current
					return (
						<li key={step}>
							<button
								type="button"
								aria-current={active ? 'step' : undefined}
								onClick={() => onSelect(step)}
								className={cn(
									'focus-visible:outline-accent w-full rounded-lg border px-3 py-2 text-left text-sm font-bold focus-visible:outline focus-visible:outline-2',
									active
										? 'bg-accent text-accent-ink border-accent'
										: 'bg-surface text-text border-border hover:bg-surface-hover'
								)}
							>
								{index + 1}. {STEP_LABELS[step]}
							</button>
						</li>
					)
				})}
			</ol>
		</nav>
	)
}
```

`src/features/levels/beginner-banner.tsx`:

```tsx
import { InfoIcon } from '@/components/ui/icons'

/** What Beginner mode means, on every level page (R84). Slice 8 adds the Developer mode version. */
export function BeginnerBanner() {
	return (
		<p className="bg-surface border-border text-text-muted flex items-start gap-2 rounded-lg border p-3 text-sm">
			<InfoIcon className="mt-0.5 shrink-0" />
			<span>
				<span className="text-text font-bold">Beginner mode.</span> Every result here is a replay of
				real recorded runs, at the speed they really ran. No model is called.
			</span>
		</p>
	)
}
```

`src/features/levels/level-skeleton.tsx`:

```tsx
const SKELETON_STEPS = 4

/** Shown while the stepper reads ?step= (DESIGN 6: every screen has a loading state). */
export function LevelSkeleton() {
	return (
		<div aria-busy="true" aria-label="Loading the level" className="flex max-w-4xl flex-col gap-6">
			<div className="bg-surface-hover h-9 w-64 animate-pulse rounded motion-reduce:animate-none" />
			<div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
				{Array.from({ length: SKELETON_STEPS }, (_, index) => (
					<div
						key={index}
						className="bg-surface-hover h-10 animate-pulse rounded-lg motion-reduce:animate-none"
					/>
				))}
			</div>
			<div className="bg-surface-hover h-48 animate-pulse rounded-lg motion-reduce:animate-none" />
		</div>
	)
}
```

`src/features/levels/learn-step.tsx`:

```tsx
import { Button } from '@/components/ui/button'
import { ArrowRightIcon } from '@/components/ui/icons'
import type { Level } from '@/content/level-schema'
import { RacerTag } from '@/features/race/racer-tag'

/** Learn: a short concept, shown as a side-by-side comparison of the racers (spec 6.1). */
export function LearnStep({ learn, onNext }: { learn: Level['learn']; onNext: () => void }) {
	return (
		<section aria-labelledby="learn-heading" className="flex flex-col gap-4">
			<h2 id="learn-heading" className="text-text text-2xl font-bold">
				Learn
			</h2>
			<p className="text-text-muted text-lg">{learn.intro}</p>
			<div className="grid gap-4 md:grid-cols-2">
				{learn.compare.map((entry) => (
					<div
						key={entry.racer}
						className="bg-surface border-border flex flex-col gap-3 rounded-lg border p-4"
					>
						<RacerTag racer={entry.racer} className="text-lg" />
						<p className="text-text font-bold">{entry.title}</p>
						<ul className="text-text-muted flex list-disc flex-col gap-1 pl-5">
							{entry.points.map((point) => (
								<li key={point}>{point}</li>
							))}
						</ul>
					</div>
				))}
			</div>
			<div>
				<Button type="button" onClick={onNext}>
					Make your prediction
					<ArrowRightIcon />
				</Button>
			</div>
		</section>
	)
}
```

`src/features/levels/predict-step.tsx`:

```tsx
'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { PREDICTABLE_RACERS, type Level } from '@/content/level-schema'
import { RacerTag } from '@/features/race/racer-tag'
import type { Prediction } from './judge'

/** Predict: one two-way pick per question, locked in with Enter or the button (spec 6.1). */
export function PredictStep({
	questions,
	initial,
	onSubmit
}: {
	questions: Level['predict']['questions']
	initial: Prediction
	onSubmit: (prediction: Prediction) => void
}) {
	const [picks, setPicks] = useState<Prediction>(initial)
	const complete = questions.every((question) => picks[question.metric] !== undefined)
	return (
		<form
			aria-labelledby="predict-heading"
			className="flex flex-col gap-4"
			onSubmit={(event) => {
				event.preventDefault()
				if (complete) onSubmit(picks)
			}}
		>
			<h2 id="predict-heading" className="text-text text-2xl font-bold">
				Predict
			</h2>
			{questions.map((question) => (
				<fieldset
					key={question.metric}
					className="bg-surface border-border flex flex-col gap-3 rounded-lg border p-4"
				>
					<legend className="text-text px-1 font-bold">{question.prompt}</legend>
					<div className="grid grid-cols-2 gap-3">
						{PREDICTABLE_RACERS.map((racer) => (
							<label
								key={racer}
								className="border-border has-[:checked]:border-accent has-[:checked]:bg-surface-hover has-[:focus-visible]:outline-accent flex cursor-pointer items-center gap-2 rounded-lg border p-3 has-[:focus-visible]:outline has-[:focus-visible]:outline-2"
							>
								<input
									type="radio"
									name={question.metric}
									value={racer}
									checked={picks[question.metric] === racer}
									onChange={() => setPicks((current) => ({ ...current, [question.metric]: racer }))}
									className="accent-accent"
								/>
								<RacerTag racer={racer} />
							</label>
						))}
					</div>
				</fieldset>
			))}
			{!complete && <p className="text-text-muted text-sm">Pick one answer for each question.</p>}
			<div>
				<Button type="submit" disabled={!complete}>
					Lock in my prediction
				</Button>
			</div>
		</form>
	)
}
```

- [ ] **Step 4: Implement the stepper**

`src/features/levels/level-stepper.tsx`:

```tsx
'use client'

import { useState } from 'react'
import type { Level } from '@/content/level-schema'
import type { Recording } from '@/content/recording-schema'
import type { Task } from '@/content/task-schema'
import { LEVEL_STEPS } from '@/lib/constants'
import { BeginnerBanner } from './beginner-banner'
import type { Prediction } from './judge'
import { LearnStep } from './learn-step'
import { defaultOpponentId, raceLineup } from './lineup'
import { PlayStep } from './play-step'
import { PredictStep } from './predict-step'
import { RevealStep } from './reveal-step'
import { StepperNav } from './stepper-nav'
import { useLevelStep } from './use-level-step'

/**
 * One level's loop: Learn, Predict, Play, Reveal (spec 6.1). The prediction
 * and opponent live here until slice 5 stores them. Level 3 (slice 6) races
 * two tasks; levels with one task pass it here.
 */
export function LevelStepper({
	level,
	task,
	recordings
}: {
	level: Level
	task: Task
	recordings: Recording[]
}) {
	const { step, goTo } = useLevelStep()
	const lineup = raceLineup(recordings)
	const [prediction, setPrediction] = useState<Prediction>({})
	const [opponentId, setOpponentId] = useState(() => defaultOpponentId(lineup.opponents))
	const opponent = lineup.opponents.find((recording) => recording.modelId === opponentId)

	return (
		<main className="flex max-w-4xl flex-col gap-6">
			<div className="flex flex-col gap-1">
				<p className="text-text-muted text-sm font-bold">Level {level.order}</p>
				<h1 className="text-text text-3xl font-extrabold">{level.title}</h1>
			</div>
			<BeginnerBanner />
			<StepperNav current={step} onSelect={goTo} />
			{step === LEVEL_STEPS.learn && (
				<LearnStep learn={level.learn} onNext={() => goTo(LEVEL_STEPS.predict)} />
			)}
			{step === LEVEL_STEPS.predict && (
				<PredictStep
					questions={level.predict.questions}
					initial={prediction}
					onSubmit={(next) => {
						setPrediction(next)
						goTo(LEVEL_STEPS.play)
					}}
				/>
			)}
			{step === LEVEL_STEPS.play && (
				<PlayStep
					task={task}
					jev={lineup.jev}
					opponents={lineup.opponents}
					opponentId={opponentId}
					onOpponentChange={setOpponentId}
					onReveal={() => goTo(LEVEL_STEPS.reveal)}
				/>
			)}
			{step === LEVEL_STEPS.reveal && (
				<RevealStep
					level={level}
					task={task}
					jev={lineup.jev}
					opponent={opponent}
					others={lineup.opponents.filter((recording) => recording !== opponent)}
					prediction={prediction}
					onRaceAgain={() => goTo(LEVEL_STEPS.play)}
				/>
			)}
		</main>
	)
}
```

- [ ] **Step 5: Run the tests**

Run: `corepack pnpm exec vitest run src/features/`
Expected: PASS.

- [ ] **Step 6: Lint, typecheck, format, commit**

```bash
git add src/features/levels/use-level-step.ts src/features/levels/use-level-step.test.ts src/features/levels/stepper-nav.tsx src/features/levels/learn-step.tsx src/features/levels/predict-step.tsx src/features/levels/predict-step.test.tsx src/features/levels/beginner-banner.tsx src/features/levels/level-skeleton.tsx src/features/levels/level-stepper.tsx src/features/levels/level-stepper.test.tsx
git commit -m "feat(levels): add the level stepper with learn and predict"
```

---

### Task 7: Level 1 content, route and Home button (stays uncommitted)

These files land in the same commit as the Speed Race recordings (progress.md part B/C). **Do not stage or commit anything in this task.**

**Files:**

- Create: `content/levels/speed-race.json`
- Modify: `src/content/levels.ts` (import the file into `RAW_LEVELS`)
- Create: `src/app/(app)/levels/[levelId]/page.tsx`
- Modify: `src/lib/links.ts` (add `ROUTES.level`)
- Modify: `src/app/(app)/page.tsx` (the "Play level 1" button)

**Interfaces:**

- Consumes: `LEVELS`, `getLevel`, `getTask`, `currentRecordings`, `LevelStepper`, `LevelSkeleton`.
- Produces: `ROUTES.level(levelId: string): string`, the `/levels/[levelId]` page.

- [ ] **Step 1: Write the level 1 content**

`content/levels/speed-race.json` (the user spot-checks this copy; the Reveal "why" is rechecked against the real recording in part C):

```json
{
	"id": "speed-race",
	"order": 1,
	"title": "Speed Race",
	"learn": {
		"intro": "Some jobs need the same quick judgment thousands of times: which team should handle this support ticket? Jev and an LLM both read the ticket and pick one of the same five teams.",
		"compare": [
			{
				"racer": "jev",
				"title": "Jev, a System One model",
				"points": [
					"Answers a typed question: here, a choice of one team",
					"Returns the answer as data, with no text to write",
					"Charges only for the tokens it reads"
				]
			},
			{
				"racer": "llm",
				"title": "An LLM, a System Two model",
				"points": [
					"Reads the same ticket and the same five teams",
					"Writes its answer as text, in a fixed JSON format",
					"Charges for the tokens it reads and the tokens it writes"
				]
			}
		]
	},
	"predict": {
		"questions": [
			{ "metric": "fastest", "prompt": "Who sorts all the tickets first?" },
			{ "metric": "cheapest", "prompt": "Who costs less?" },
			{ "metric": "most_accurate", "prompt": "Who sorts more tickets correctly?" }
		]
	},
	"taskIds": ["speed-race"],
	"reveal": {
		"why": [
			"Jev answers a typed question directly, so each call returns quickly and costs only the tokens it reads.",
			"The LLM writes its answer as text and pays for every token it writes, on every ticket.",
			"One ticket makes little difference. Thousands of tickets a day is where speed and cost add up."
		]
	},
	"docs": [{ "path": "/concepts/system-one", "title": "System One models" }]
}
```

Add `import speedRace from '../../content/levels/speed-race.json'` to `src/content/levels.ts`, set `const RAW_LEVELS: unknown[] = [speedRace]`, and drop the sentence "Level 1 lands with the Speed Race recordings." from its comment.

- [ ] **Step 2: Add the route constant**

In `src/lib/links.ts`, add to `ROUTES`:

```ts
level: (levelId: string) => `/levels/${levelId}`
```

- [ ] **Step 3: Write the page**

`src/app/(app)/levels/[levelId]/page.tsx` (read `node_modules/next/dist/docs/01-app/03-api-reference/04-functions/generate-static-params.md` and `.../use-search-params.md` first):

```tsx
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Suspense } from 'react'
import { getLevel, LEVELS } from '@/content/levels'
import { currentRecordings } from '@/content/recordings'
import { getTask } from '@/content/tasks'
import { LevelSkeleton } from '@/features/levels/level-skeleton'
import { LevelStepper } from '@/features/levels/level-stepper'

// Every level is prerendered from content/ (TECH-STACK.md > Rendering strategy: SSG shell + CSR).
export function generateStaticParams() {
	return [...LEVELS.keys()].map((levelId) => ({ levelId }))
}

export async function generateMetadata({
	params
}: PageProps<'/levels/[levelId]'>): Promise<Metadata> {
	const { levelId } = await params
	const level = getLevel(levelId)
	return { title: level ? `${level.title} - Jev's Playground` : "Jev's Playground" }
}

export default async function LevelPage({ params }: PageProps<'/levels/[levelId]'>) {
	const { levelId } = await params
	const level = getLevel(levelId)
	if (!level) notFound()
	const [taskId] = level.taskIds
	if (!taskId) notFound()
	const task = getTask(taskId)
	// Only this page's recordings reach the client (R79).
	const recordings = currentRecordings(task.id)
	return (
		<Suspense fallback={<LevelSkeleton />}>
			<LevelStepper level={level} task={task} recordings={recordings} />
		</Suspense>
	)
}
```

- [ ] **Step 4: Add the Home button**

In `src/app/(app)/page.tsx`, import `LEVELS` and render the first level's button before the Glossary button:

```tsx
const firstLevel = [...LEVELS.values()][0]
```

```tsx
<div className="flex flex-wrap gap-3">
	{firstLevel && (
		<Button asChild>
			<Link href={ROUTES.level(firstLevel.id)}>
				Play level {firstLevel.order}: {firstLevel.title}
			</Link>
		</Button>
	)}
	<Button asChild variant="secondary">
		<Link href={ROUTES.glossary}>Read the Glossary</Link>
	</Button>
</div>
```

Keep the existing "Slice 5 turns this into the full Home" comment.

- [ ] **Step 5: Verify**

- `corepack pnpm exec vitest run src/content/` passes except the known speed-race recording failure.
- `corepack pnpm lint`, `corepack pnpm typecheck`, `corepack pnpm format:check`, `corepack pnpm build` pass.
- In Chrome (Claude-in-Chrome, ROADMAP Rule-11) on `corepack pnpm dev`: sign in, click "Play level 1: Speed Race" on Home, then check Learn and Predict in both themes at desktop and phone width (no horizontal scroll), that Enter locks in the prediction, that the back button returns to the previous step, and that Play and Reveal show their "not recorded yet" states.
- `git status` shows these files as modified or untracked, and nothing from this task is staged.
