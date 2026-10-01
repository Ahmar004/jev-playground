# Slice 3 - Recording CLI + Level 1 Content Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `pnpm record` (with `--task`, `--model`, `--dry-run`) that runs Jev and the three Claude models over a task through the shared runner and writes validated Recordings; the Speed Race task (40 tickets) and its first real recording; the Methodology page linked from the footer; the Commands-table row in `CLAUDE.md`.

**Architecture:** The CLI is a thin entry (`scripts/record.ts`) over small, tested modules in `scripts/record/`. Every number in a recording comes from the slice 2 runner (`runItems`, `jevRacer`, `llmRacer`, `callTypeSafe`, `callAnthropic`), so recorded and live numbers share one code path (R92). Provider calls are injected into `recordTarget`, so tests never touch the network and the runner never holds a key. Keys are read only by the CLI (from `.env.local`), never by app code. The Methodology page is a static server component that reads `PRICES`, `TASKS` and the server-only recordings registry.

**Tech Stack:** Node 22 + `tsx` (new devDependency, named in TECH-STACK.md), `node:util` `parseArgs`, `node:fs`, Prettier's API to format written JSON, Zod 4, Vitest (node environment for `scripts/`), Next.js 16 server components, Playwright.

**Spec:** `DESIGN.md` 2.1, 3.2, 4.1, 4.2, 6 (`/methodology` row), 16 (slice 3); `spec.md` 3.2 (recordings), 6.2 (level 1), 12.4 (honesty, R93), R7, R22, R44, R92; `TECH-STACK.md` (Recording CLI row); `CLAUDE.md` product guardrails.

## User rulings for this slice (2026-10-01)

- Speed Race categories: `billing`, `technical`, `account`, `shipping`, `feature_request`, 8 tickets each, for a fictional online shop. Tickets are fairly clear-cut (some typos or a side topic, but one obvious main category), because the lesson is speed and cost.
- The Methodology link sits in the footer next to Glossary.
- `tsx` is added as a devDependency.

## Decisions taken in this plan

- Owner keys (`TYPESAFE_API_KEY`, `ANTHROPIC_API_KEY`) are documented in `.env.example` and read only by `scripts/record/keys.ts`. They are not added to `src/lib/env.ts`, so app code can never read them (DESIGN 4.2: "never read by app code").
- The CLI skips a (task, model) pair when its recording file exists with the current `taskHash`. There is no force flag: the same items are never re-run to get a different result (spec 12.4).
- `--dry-run` estimates input tokens as characters / 4 of the exact request (Jev body JSON or LLM prompt), plus a fixed output allowance of 500 tokens per LLM call (Opus 5.5 thinks at low effort; Jev output is free). The allowance is printed so the estimate is never mistaken for a measured number.
- The budget line sums `totals.costUsd` over every recording file on disk plus nothing else, against the $50 budget (Rule-0.1).
- The recording's `modelId` is the model the provider says answered. If one run sees two different answering models, nothing is written and the run fails loudly.
- Written recordings are formatted with Prettier's API, so `format:check` passes without ignoring `content/recordings/`.
- New task and recording files are added to the registries by hand; the CLI prints the exact import lines, and `registry.test.ts` enforces it.

## Global Constraints

- Run every package script as `corepack pnpm <script>` (pnpm is not on PATH). Vitest alone: `corepack pnpm exec vitest run <path>`.
- No emojis anywhere. No long dashes in code, comments, copy or docs: use a single hyphen "-".
- No `any`, and avoid `as` type assertions; narrow with type guards or Zod.
- Enum-like values come from `src/lib/constants.ts` (`RACERS`, `CLAUDE_MODELS`, `JEV_MODEL_ALIAS`, `RACE_LANES`, `RUN_EVENTS`, `TASK_KINDS`, `QUESTION_KINDS`), never repeated as inline literals in `scripts/record/` or `src/`. Test fixtures may use literals.
- No magic numbers: name every threshold and limit as a `const`.
- Never `console.*` in `src/`. `scripts/` may print with `console.log`/`console.error` (the CLI's output is its UI).
- Never print, log, write or throw an API key. Error text names the missing variable, never its value.
- One request per call, no retries (R7). A failed or unparseable call is stored exactly as it happened (R44, spec 12.4).
- UI: build from tokens in `src/app/globals.css` and the existing page patterns (see `src/app/(app)/glossary/page.tsx`). Model and user text render as plain text. No `dangerouslySetInnerHTML`. External links only to TypeSafe docs; other source URLs render as plain text.
- Vitest test files under `scripts/` start with `// @vitest-environment node`.
- Commits: Conventional Commits, header 72 characters or less, ending with the two lines:
  `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` and `Claude-Session: https://claude.ai/code/session_01Vme75YtvfRzT3i2uXgd6TQ`. Commit straight to `main`. Do not push.
- Do not create `content/tasks/` or `content/recordings/` files in Tasks 1-3: `src/content/registry.test.ts` fails the suite for any task without current recordings. Tests use fixtures from `src/runner/testing/tasks.ts` and temp directories.

---

### Task 1: CLI targets, arguments and dry-run estimate

**Files:**

- Modify: `package.json` (add `tsx` devDependency via `corepack pnpm add -D tsx`; add script `"record": "tsx --env-file-if-exists=.env.local scripts/record.ts"`)
- Modify: `vitest.config.ts` (include `scripts/**/*.test.ts`)
- Create: `scripts/record/targets.ts`
- Create: `scripts/record/estimate.ts`
- Test: `scripts/record/targets.test.ts`, `scripts/record/estimate.test.ts`

**Interfaces:**

- Consumes: `Task` (`@/content/task-schema`), `PriceTable` (`@/content/prices`), `priceFor` (`@/runner/cost`), `buildJevRequest` (`@/runner/jev-request`), `buildLlmPrompt` (`@/runner/llm-prompt`), `recordingSlug` (`@/content/recording-schema`), `RACERS`, `CLAUDE_MODELS`, `JEV_MODEL_ALIAS`.
- Produces:
  - `RECORD_MODELS: readonly string[]` = `[RACERS.jev, CLAUDE_MODELS.haiku, CLAUDE_MODELS.sonnet, CLAUDE_MODELS.opus]` (`'jev'` names Jev on the command line).
  - `type CliArgs = { taskId: string | null; model: string | null; dryRun: boolean }`
  - `parseCliArgs(argv: string[]): CliArgs` (throws `Error` on an unknown flag or a model not in `RECORD_MODELS`).
  - `type Target = { taskId: string; racer: typeof RACERS.jev | typeof RACERS.llm; modelId: string; slug: string }` (for Jev, `modelId` is `JEV_MODEL_ALIAS` and `slug` is `'jev'`; for Claude, both are the Claude id).
  - `selectTargets(tasks: ReadonlyMap<string, Task>, args: CliArgs, existingHash: (taskId: string, slug: string) => string | null, hashOf: (task: Task) => string): { run: Target[]; skipped: Target[] }` (throws on an unknown `--task`).
  - `CHARS_PER_TOKEN = 4`, `LLM_OUTPUT_ALLOWANCE_TOKENS = 500`.
  - `type Estimate = { calls: number; inputTokens: number; outputTokens: number; costUsd: number | null }`
  - `estimateTarget(task: Task, target: Target, prices: PriceTable): Estimate`

- [ ] **Step 1: Install tsx and widen Vitest**

Run: `corepack pnpm add -D tsx`
Then in `package.json` scripts, after `"test:e2e"`, add `"record": "tsx --env-file-if-exists=.env.local scripts/record.ts",`.
In `vitest.config.ts` change `include: ['src/**/*.test.{ts,tsx}']` to `include: ['src/**/*.test.{ts,tsx}', 'scripts/**/*.test.ts']` and extend the comment above `defineConfig` with: `// scripts/**/*.test.ts covers the recording CLI's modules (node environment).`

- [ ] **Step 2: Write the failing tests**

`scripts/record/targets.test.ts`:

```ts
// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { choiceTask, noulTask } from '@/runner/testing/tasks'
import { parseCliArgs, RECORD_MODELS, selectTargets } from './targets'

const tasks = new Map([
	[choiceTask.id, choiceTask],
	[noulTask.id, noulTask]
])
const hashOf = (task: { id: string }) => `hash-${task.id}`

describe('parseCliArgs', () => {
	it('defaults to every task and model, for real', () => {
		expect(parseCliArgs([])).toEqual({ taskId: null, model: null, dryRun: false })
	})

	it('reads --task, --model and --dry-run', () => {
		expect(parseCliArgs(['--task', 'x', '--model', 'claude-opus-5-5', '--dry-run'])).toEqual({
			taskId: 'x',
			model: 'claude-opus-5-5',
			dryRun: true
		})
	})

	it('rejects a model it does not record', () => {
		expect(() => parseCliArgs(['--model', 'gpt-9'])).toThrow(/gpt-9/)
	})

	it('rejects an unknown flag', () => {
		expect(() => parseCliArgs(['--force'])).toThrow()
	})
})

describe('selectTargets', () => {
	const none = () => null

	it('runs Jev then the three Claude models for every task', () => {
		const { run, skipped } = selectTargets(tasks, parseCliArgs([]), none, hashOf)
		expect(skipped).toEqual([])
		expect(run).toHaveLength(tasks.size * RECORD_MODELS.length)
		expect(run[0]).toEqual({
			taskId: choiceTask.id,
			racer: 'jev',
			modelId: 'jev-latest',
			slug: 'jev'
		})
		expect(run[1]).toEqual({
			taskId: choiceTask.id,
			racer: 'llm',
			modelId: 'claude-haiku-4-5-20251001',
			slug: 'claude-haiku-4-5-20251001'
		})
	})

	it('filters by --task and --model', () => {
		const args = parseCliArgs(['--task', noulTask.id, '--model', 'jev'])
		const { run } = selectTargets(tasks, args, none, hashOf)
		expect(run).toEqual([{ taskId: noulTask.id, racer: 'jev', modelId: 'jev-latest', slug: 'jev' }])
	})

	it('skips a pair whose recording has the current hash, and reruns a stale one', () => {
		const existing = (taskId: string, slug: string) =>
			slug === 'jev' ? (taskId === choiceTask.id ? `hash-${choiceTask.id}` : 'old-hash') : null
		const args = parseCliArgs(['--model', 'jev'])
		const { run, skipped } = selectTargets(tasks, args, existing, hashOf)
		expect(skipped.map((target) => target.taskId)).toEqual([choiceTask.id])
		expect(run.map((target) => target.taskId)).toEqual([noulTask.id])
	})

	it('throws on an unknown task', () => {
		expect(() => selectTargets(tasks, parseCliArgs(['--task', 'nope']), none, hashOf)).toThrow(
			/nope/
		)
	})
})
```

`scripts/record/estimate.test.ts`:

```ts
// @vitest-environment node
import { describe, expect, it } from 'vitest'
import type { PriceTable } from '@/content/prices'
import { buildJevRequest } from '@/runner/jev-request'
import { buildLlmPrompt } from '@/runner/llm-prompt'
import { choiceTask } from '@/runner/testing/tasks'
import { CHARS_PER_TOKEN, estimateTarget, LLM_OUTPUT_ALLOWANCE_TOKENS } from './estimate'

const prices: PriceTable = {
	checkedOn: '2026-10-01',
	models: {
		'jev-1.13.0': { inputPerM: 0.042, outputPerM: 0, source: 'https://docs.typesafe.ai/models' },
		'claude-opus-5-5': { inputPerM: 4, outputPerM: 20, source: 'https://example.com/pricing' }
	}
}

describe('estimateTarget', () => {
	it('counts Jev input as characters / 4 of each request body, output free', () => {
		const chars = choiceTask.items.reduce(
			(sum, item) => sum + JSON.stringify(buildJevRequest(choiceTask, item)).length,
			0
		)
		const estimate = estimateTarget(
			choiceTask,
			{ taskId: choiceTask.id, racer: 'jev', modelId: 'jev-latest', slug: 'jev' },
			prices
		)
		const inputTokens = choiceTask.items.reduce(
			(sum, item) =>
				sum + Math.ceil(JSON.stringify(buildJevRequest(choiceTask, item)).length / CHARS_PER_TOKEN),
			0
		)
		expect(chars).toBeGreaterThan(0)
		expect(estimate).toEqual({
			calls: choiceTask.items.length,
			inputTokens,
			outputTokens: 0,
			costUsd: (inputTokens * 0.042) / 1_000_000
		})
	})

	it('adds the output allowance per LLM call', () => {
		const target = {
			taskId: choiceTask.id,
			racer: 'llm' as const,
			modelId: 'claude-opus-5-5',
			slug: 'claude-opus-5-5'
		}
		const inputTokens = choiceTask.items.reduce(
			(sum, item) => sum + Math.ceil(buildLlmPrompt(choiceTask, item).length / CHARS_PER_TOKEN),
			0
		)
		const outputTokens = choiceTask.items.length * LLM_OUTPUT_ALLOWANCE_TOKENS
		expect(estimateTarget(choiceTask, target, prices)).toEqual({
			calls: choiceTask.items.length,
			inputTokens,
			outputTokens,
			costUsd: (inputTokens * 4 + outputTokens * 20) / 1_000_000
		})
	})

	it('reports price unknown for a model with no stored price', () => {
		const target = {
			taskId: choiceTask.id,
			racer: 'llm' as const,
			modelId: 'claude-sonnet-5-5',
			slug: 'claude-sonnet-5-5'
		}
		expect(estimateTarget(choiceTask, target, prices).costUsd).toBeNull()
	})
})
```

Note: the `'llm' as const` literals are test fixtures; if the typesafe audit objects, type the fixture as `Target` instead.

- [ ] **Step 3: Run the tests to see them fail**

Run: `corepack pnpm exec vitest run scripts/record`
Expected: FAIL, modules `./targets` and `./estimate` not found.

- [ ] **Step 4: Implement `scripts/record/targets.ts`**

```ts
import { parseArgs } from 'node:util'
import { recordingSlug } from '@/content/recording-schema'
import type { Task } from '@/content/task-schema'
import { CLAUDE_MODELS, JEV_MODEL_ALIAS, RACERS } from '@/lib/constants'

// Jev plus the three Claude models, in the order they are recorded (DESIGN 4.2).
// On the command line, "jev" names Jev.
export const RECORD_MODELS: readonly string[] = [
	RACERS.jev,
	CLAUDE_MODELS.haiku,
	CLAUDE_MODELS.sonnet,
	CLAUDE_MODELS.opus
]

export type CliArgs = { taskId: string | null; model: string | null; dryRun: boolean }

export function parseCliArgs(argv: string[]): CliArgs {
	const { values } = parseArgs({
		args: argv,
		options: {
			task: { type: 'string' },
			model: { type: 'string' },
			'dry-run': { type: 'boolean', default: false }
		},
		strict: true,
		allowPositionals: false
	})
	const model = values.model ?? null
	if (model !== null && !RECORD_MODELS.includes(model)) {
		throw new Error(`Unknown model "${model}". Use one of: ${RECORD_MODELS.join(', ')}`)
	}
	return { taskId: values.task ?? null, model, dryRun: values['dry-run'] }
}

export type Target = {
	taskId: string
	racer: typeof RACERS.jev | typeof RACERS.llm
	// What the request names: the Jev alias, or the Claude model id.
	modelId: string
	// The recording file's name (recordingSlug).
	slug: string
}

function targetFor(taskId: string, model: string): Target {
	if (model === RACERS.jev) {
		const racer = RACERS.jev
		return {
			taskId,
			racer,
			modelId: JEV_MODEL_ALIAS,
			slug: recordingSlug({ racer, modelId: JEV_MODEL_ALIAS })
		}
	}
	const racer = RACERS.llm
	return { taskId, racer, modelId: model, slug: recordingSlug({ racer, modelId: model }) }
}

/**
 * The (task, model) pairs to record. A pair whose recording already has the
 * task's current hash is skipped: the same items are never re-run to get a
 * different result (spec 12.4).
 */
export function selectTargets(
	tasks: ReadonlyMap<string, Task>,
	args: CliArgs,
	existingHash: (taskId: string, slug: string) => string | null,
	hashOf: (task: Task) => string
): { run: Target[]; skipped: Target[] } {
	if (args.taskId !== null && !tasks.has(args.taskId)) {
		throw new Error(`Unknown task "${args.taskId}"`)
	}
	const chosenTasks = [...tasks.values()].filter(
		(task) => args.taskId === null || task.id === args.taskId
	)
	const models = RECORD_MODELS.filter((model) => args.model === null || model === args.model)
	const run: Target[] = []
	const skipped: Target[] = []
	for (const task of chosenTasks) {
		const hash = hashOf(task)
		for (const model of models) {
			const target = targetFor(task.id, model)
			if (existingHash(task.id, target.slug) === hash) skipped.push(target)
			else run.push(target)
		}
	}
	return { run, skipped }
}
```

- [ ] **Step 5: Implement `scripts/record/estimate.ts`**

```ts
import type { PriceTable } from '@/content/prices'
import type { Task } from '@/content/task-schema'
import { RACERS } from '@/lib/constants'
import { costUsd, priceFor } from '@/runner/cost'
import { buildJevRequest } from '@/runner/jev-request'
import { buildLlmPrompt } from '@/runner/llm-prompt'
import type { Target } from './targets'

// Dry-run only (DESIGN 4.2): a rough token count, never stored or shown in the app.
export const CHARS_PER_TOKEN = 4
// Room per LLM call for the short JSON answer plus Opus 5.5's low-effort
// thinking. Printed with the estimate, so it is never taken for a measurement.
export const LLM_OUTPUT_ALLOWANCE_TOKENS = 500
// Price-table keys for Jev versions start with this (jev-1.13.0).
const JEV_PRICE_PREFIX = 'jev-'

export type Estimate = {
	calls: number
	inputTokens: number
	outputTokens: number
	costUsd: number | null
}

function tokens(text: string): number {
	return Math.ceil(text.length / CHARS_PER_TOKEN)
}

// The request names the Jev alias; the table is keyed by version. Use the
// newest version the table knows.
function jevPriceKeys(prices: PriceTable): string[] {
	return Object.keys(prices.models)
		.filter((key) => key.startsWith(JEV_PRICE_PREFIX))
		.sort()
		.reverse()
}

export function estimateTarget(task: Task, target: Target, prices: PriceTable): Estimate {
	const isJev = target.racer === RACERS.jev
	const inputTokens = task.items.reduce(
		(sum, item) =>
			sum +
			tokens(isJev ? JSON.stringify(buildJevRequest(task, item)) : buildLlmPrompt(task, item)),
		0
	)
	const outputTokens = isJev ? 0 : task.items.length * LLM_OUTPUT_ALLOWANCE_TOKENS
	const price = priceFor(prices, isJev ? jevPriceKeys(prices) : [target.modelId])
	return {
		calls: task.items.length,
		inputTokens,
		outputTokens,
		costUsd: costUsd({ inputTokens, outputTokens }, price)
	}
}
```

- [ ] **Step 6: Run the tests to see them pass**

Run: `corepack pnpm exec vitest run scripts/record`
Expected: PASS. Then `corepack pnpm lint` and `corepack pnpm typecheck` pass.

- [ ] **Step 7: Commit**

```bash
git add package.json pnpm-lock.yaml vitest.config.ts scripts/record/targets.ts scripts/record/targets.test.ts scripts/record/estimate.ts scripts/record/estimate.test.ts
git commit -m "feat(record): add cli targets and the dry-run estimate"
```

---

### Task 2: Record a target, write files, the CLI entry

**Files:**

- Create: `scripts/record/record-target.ts`
- Create: `scripts/record/files.ts`
- Create: `scripts/record/keys.ts`
- Create: `scripts/record.ts`
- Test: `scripts/record/record-target.test.ts`, `scripts/record/files.test.ts`, `scripts/record/keys.test.ts`

**Interfaces:**

- Consumes: `Target`, `parseCliArgs`, `selectTargets`, `estimateTarget`, `LLM_OUTPUT_ALLOWANCE_TOKENS` (Task 1); `runItems` (`@/runner/run`), `jevRacer`, `llmRacer` (`@/runner/racers`), `callTypeSafe` (`@/runner/providers/typesafe`), `callAnthropic`, `buildAnthropicBody` (`@/runner/providers/anthropic`), `priceFor`, `recordingSchema`, `type Recording`, `recordingSlug`, `taskHash`, `TASKS`, `PRICES`, `RUN_EVENTS`, `RACE_LANES`.
- Produces:
  - `type ProviderCalls = { jev: (body: JevRequestBody, signal: AbortSignal) => Promise<ProviderResult>; llm: (modelId: string, prompt: string, signal: AbortSignal) => Promise<ProviderResult> }`
  - `recordTarget(task: Task, target: Target, options: { calls: ProviderCalls; prices: PriceTable; recordedAt: Date; signal?: AbortSignal; onEvent?: (event: RunEvent) => void; now?: () => number }): Promise<Recording>`
  - `recordingPath(root: string, taskId: string, slug: string): string`
  - `readRecordedHash(root: string, taskId: string, slug: string): string | null`
  - `writeRecording(root: string, recording: Recording): Promise<string>` (returns the path written)
  - `recordedSpend(root: string): { costUsd: number; unknownPriceFiles: number }`
  - `BUDGET_USD = 50`
  - `ownerKeys(env: Record<string, string | undefined>, needs: { jev: boolean; llm: boolean }): { typesafe: string | null; anthropic: string | null }`

- [ ] **Step 1: Write the failing tests**

`scripts/record/record-target.test.ts`:

```ts
// @vitest-environment node
import { describe, expect, it } from 'vitest'
import type { PriceTable } from '@/content/prices'
import { recordingSchema } from '@/content/recording-schema'
import { taskHash } from '@/content/task-hash'
import { choiceTask } from '@/runner/testing/tasks'
import type { ProviderResult } from '@/runner/types'
import { recordTarget, type ProviderCalls } from './record-target'

const prices: PriceTable = {
	checkedOn: '2026-10-01',
	models: {
		'jev-1.13.0': { inputPerM: 0.042, outputPerM: 0, source: 'https://docs.typesafe.ai/models' },
		'claude-opus-5-5': { inputPerM: 4, outputPerM: 20, source: 'https://example.com/pricing' }
	}
}
// t3 has no label (not scored); any valid option will do for it.
const UNSCORED_CHOICE = 'sales'
const label = (itemId: string) => {
	const found = choiceTask.items.find((item) => item.id === itemId)?.label
	return typeof found === 'string' ? found : UNSCORED_CHOICE
}
const jevTarget = {
	taskId: choiceTask.id,
	racer: 'jev',
	modelId: 'jev-latest',
	slug: 'jev'
} as const
const opusTarget = {
	taskId: choiceTask.id,
	racer: 'llm',
	modelId: 'claude-opus-5-5',
	slug: 'claude-opus-5-5'
} as const

function jevReply(choice: string, model = 'jev-1.13.0'): ProviderResult {
	return {
		text: JSON.stringify({
			model,
			answers: {
				answer: { type: 'choice', choice, probabilities: { [choice]: 0.9 }, confidence: 0.9 }
			},
			usage: { input_tokens: 100, output_tokens: 3 }
		}),
		latencyMs: 40,
		usage: { inputTokens: 100, outputTokens: 3 },
		modelId: model
	}
}

function calls(overrides: Partial<ProviderCalls> = {}): ProviderCalls {
	return {
		jev: async (body) => {
			const state = JSON.stringify(body.state)
			const item = choiceTask.items.find((entry) => JSON.stringify(entry.state) === state)
			return jevReply(item ? label(item.id) : 'none')
		},
		llm: async (modelId) => ({
			text: '{"answer": "not-an-option"}',
			latencyMs: 300,
			usage: { inputTokens: 200, outputTokens: 50 },
			modelId
		}),
		...overrides
	}
}

const recordedAt = new Date('2026-10-01T12:00:00.000Z')

describe('recordTarget', () => {
	it('records Jev as a valid Recording named after the answering version', async () => {
		const recording = await recordTarget(choiceTask, jevTarget, {
			calls: calls(),
			prices,
			recordedAt
		})
		expect(recordingSchema.parse(recording)).toEqual(recording)
		expect(recording).toMatchObject({
			taskId: choiceTask.id,
			taskHash: taskHash(choiceTask),
			racer: 'jev',
			modelId: 'jev-1.13.0',
			recordedAt: '2026-10-01T12:00:00.000Z',
			price: prices.models['jev-1.13.0'],
			lanes: 4
		})
		expect(recording.events.map((event) => event.itemId)).toEqual(
			choiceTask.items.map((item) => item.id)
		)
		expect(recording.totals.accuracy).toBe(1)
		for (const event of recording.events) expect(event.endMs).toBeGreaterThanOrEqual(event.startMs)
	})

	it('stores a wrong LLM answer as a miss, unedited (R44, spec 12.4)', async () => {
		const recording = await recordTarget(choiceTask, opusTarget, {
			calls: calls(),
			prices,
			recordedAt
		})
		expect(recording.modelId).toBe('claude-opus-5-5')
		expect(recording.totals.correct).toBe(0)
		expect(recording.events[0]).toMatchObject({
			raw: '{"answer": "not-an-option"}',
			correct: false
		})
		expect(recording.totals.costUsd).toBeCloseTo(
			(choiceTask.items.length * (200 * 4 + 50 * 20)) / 1_000_000
		)
	})

	it('passes the requested model id to the LLM call', async () => {
		const seen: string[] = []
		await recordTarget(choiceTask, opusTarget, {
			calls: calls({
				llm: async (modelId) => {
					seen.push(modelId)
					return {
						text: '{"answer": "x"}',
						latencyMs: 1,
						usage: { inputTokens: 1, outputTokens: 1 },
						modelId
					}
				}
			}),
			prices,
			recordedAt
		})
		expect(new Set(seen)).toEqual(new Set(['claude-opus-5-5']))
	})

	it('refuses to write a run answered by two different models', async () => {
		let n = 0
		const mixed = calls({
			jev: async () => {
				n += 1
				return jevReply('a', n === 1 ? 'jev-1.13.0' : 'jev-1.14.0')
			}
		})
		await expect(
			recordTarget(choiceTask, jevTarget, { calls: mixed, prices, recordedAt })
		).rejects.toThrow(/jev-1.13.0.*jev-1.14.0|jev-1.14.0.*jev-1.13.0/)
	})

	it('throws when aborted, so nothing is written', async () => {
		const controller = new AbortController()
		controller.abort()
		await expect(
			recordTarget(choiceTask, jevTarget, {
				calls: calls(),
				prices,
				recordedAt,
				signal: controller.signal
			})
		).rejects.toThrow(/aborted/i)
	})
})
```

`choiceTask` (in `src/runner/testing/tasks.ts`) has options `billing`, `technical`, `sales` and items `t1` (billing), `t2` (technical), `t3` (no label, not scored). Jev's mock answers every scored item right, so accuracy is 1; the LLM's `not-an-option` is wrong on every scored item (check `src/runner/parse.ts`: if it rejects a non-option string as a parse failure instead, `ok` becomes false and the assertions on `correct` and `raw` still hold).

`scripts/record/files.test.ts`:

```ts
// @vitest-environment node
import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { recordingSchema, type Recording } from '@/content/recording-schema'
import { readRecordedHash, recordedSpend, recordingPath, writeRecording } from './files'

const HASH = 'a'.repeat(64)

function recording(overrides: Partial<Recording> = {}): Recording {
	return recordingSchema.parse({
		taskId: 'demo',
		taskHash: HASH,
		racer: 'llm',
		modelId: 'claude-opus-5-5',
		recordedAt: '2026-10-01T12:00:00.000Z',
		price: { inputPerM: 4, outputPerM: 20, source: 'https://example.com/pricing' },
		lanes: 4,
		events: [
			{
				itemId: 'i1',
				ok: true,
				raw: '{"answer":"a"}',
				parsed: 'a',
				credit: 1,
				correct: true,
				latencyMs: 10,
				usage: { inputTokens: 1, outputTokens: 1 },
				costUsd: 0.25,
				lane: 0,
				startMs: 0,
				endMs: 10
			}
		],
		totals: {
			items: 1,
			scored: 1,
			correct: 1,
			accuracy: 1,
			wallMs: 10,
			costUsd: 0.25,
			inputTokens: 1,
			outputTokens: 1,
			parseFailures: 0
		},
		...overrides
	})
}

let root: string
beforeEach(() => {
	root = mkdtempSync(join(tmpdir(), 'record-'))
})
afterEach(() => {
	rmSync(root, { recursive: true, force: true })
})

describe('recording files', () => {
	it('writes to content/recordings/<taskId>/<slug>.json, formatted and valid', async () => {
		const path = await writeRecording(root, recording())
		expect(path).toBe(recordingPath(root, 'demo', 'claude-opus-5-5'))
		const text = readFileSync(path, 'utf8')
		expect(text.endsWith('\n')).toBe(true)
		expect(text).toContain('\t"taskId": "demo"')
		expect(recordingSchema.parse(JSON.parse(text))).toEqual(recording())
	})

	it('reads the stored hash, or null when there is no file', async () => {
		expect(readRecordedHash(root, 'demo', 'claude-opus-5-5')).toBeNull()
		await writeRecording(root, recording())
		expect(readRecordedHash(root, 'demo', 'claude-opus-5-5')).toBe(HASH)
	})

	it('sums the cost of every recording on disk', async () => {
		await writeRecording(root, recording())
		await writeRecording(root, recording({ taskId: 'other' }))
		await writeRecording(
			root,
			recording({ taskId: 'third', totals: { ...recording().totals, costUsd: null } })
		)
		expect(recordedSpend(root)).toEqual({ costUsd: 0.5, unknownPriceFiles: 1 })
	})

	it('reports zero spend when there are no recordings', () => {
		expect(recordedSpend(root)).toEqual({ costUsd: 0, unknownPriceFiles: 0 })
	})
})
```

`scripts/record/keys.test.ts`:

```ts
// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { ownerKeys } from './keys'

describe('ownerKeys', () => {
	it('returns only the keys a run needs', () => {
		const env = { TYPESAFE_API_KEY: 'ts-secret', ANTHROPIC_API_KEY: 'an-secret' }
		expect(ownerKeys(env, { jev: true, llm: false })).toEqual({
			typesafe: 'ts-secret',
			anthropic: null
		})
	})

	it('names the missing variable without printing any value', () => {
		const env = { TYPESAFE_API_KEY: 'ts-secret' }
		expect(() => ownerKeys(env, { jev: true, llm: true })).toThrow(/ANTHROPIC_API_KEY/)
		try {
			ownerKeys(env, { jev: true, llm: true })
		} catch (error) {
			expect(String(error)).not.toContain('ts-secret')
		}
	})

	it('treats an empty value as missing', () => {
		expect(() => ownerKeys({ TYPESAFE_API_KEY: '' }, { jev: true, llm: false })).toThrow(
			/TYPESAFE_API_KEY/
		)
	})
})
```

- [ ] **Step 2: Run the tests to see them fail**

Run: `corepack pnpm exec vitest run scripts/record`
Expected: FAIL, modules `./record-target`, `./files` and `./keys` not found.

- [ ] **Step 3: Implement `scripts/record/record-target.ts`**

```ts
import type { PriceTable } from '@/content/prices'
import { recordingSchema, type Recording } from '@/content/recording-schema'
import { taskHash } from '@/content/task-hash'
import type { Task } from '@/content/task-schema'
import { RACE_LANES, RACERS, RUN_EVENTS } from '@/lib/constants'
import { priceFor } from '@/runner/cost'
import { jevRacer, llmRacer } from '@/runner/racers'
import { runItems } from '@/runner/run'
import type { JevRequestBody, ProviderResult, RunEvent } from '@/runner/types'
import type { Target } from './targets'

// The provider calls with the owner's key bound by the caller (scripts/record.ts).
export type ProviderCalls = {
	jev: (body: JevRequestBody, signal: AbortSignal) => Promise<ProviderResult>
	llm: (modelId: string, prompt: string, signal: AbortSignal) => Promise<ProviderResult>
}

type RecordOptions = {
	calls: ProviderCalls
	prices: PriceTable
	recordedAt: Date
	signal?: AbortSignal
	onEvent?: (event: RunEvent) => void
	now?: () => number
}

type RecordedEvent = Recording['events'][number]

/**
 * Runs one racer over a task through the shared runner (R92) and returns the
 * Recording. Every result is stored as it happened: failed and unparseable
 * calls included (R44, spec 12.4).
 */
export async function recordTarget(
	task: Task,
	target: Target,
	options: RecordOptions
): Promise<Recording> {
	const { calls, prices, recordedAt, signal, onEvent, now } = options
	// The model each response says answered: the recording names that one.
	const answeredBy = new Set<string>()
	const noteModel = async (call: Promise<ProviderResult>) => {
		const result = await call
		answeredBy.add(result.modelId)
		return result
	}

	const runItem =
		target.racer === RACERS.jev
			? jevRacer({ task, prices, call: (body, s) => noteModel(calls.jev(body, s)) })
			: llmRacer({
					task,
					prices,
					modelId: target.modelId,
					call: (prompt, s) => noteModel(calls.llm(target.modelId, prompt, s))
				})

	const startedAt = new Map<string, number>()
	const events: RecordedEvent[] = []
	const totals = await runItems(task, target.racer, runItem, {
		lanes: RACE_LANES,
		signal,
		now,
		onEvent: (event) => {
			if (event.type === RUN_EVENTS.itemStarted) startedAt.set(event.itemId, event.atMs)
			if (event.type === RUN_EVENTS.itemFinished) {
				const startMs = startedAt.get(event.result.itemId) ?? event.atMs
				events.push({ ...event.result, lane: event.lane, startMs, endMs: event.atMs })
			}
			onEvent?.(event)
		}
	})
	if (!totals) throw new Error('Recording aborted; nothing was written')

	if (answeredBy.size > 1) {
		throw new Error(
			`One run was answered by more than one model (${[...answeredBy].join(', ')}); nothing was written`
		)
	}
	const modelId = [...answeredBy][0] ?? target.modelId
	const order = new Map(task.items.map((item, index) => [item.id, index]))
	events.sort((a, b) => (order.get(a.itemId) ?? 0) - (order.get(b.itemId) ?? 0))

	return recordingSchema.parse({
		taskId: task.id,
		taskHash: taskHash(task),
		racer: target.racer,
		modelId,
		recordedAt: recordedAt.toISOString(),
		price: priceFor(prices, [modelId, target.modelId]),
		lanes: RACE_LANES,
		events,
		totals
	})
}
```

If `runItems`' options type does not accept `now: undefined` under `exactOptionalPropertyTypes`, spread it conditionally: `...(now ? { now } : {})`. Same for `signal`.

- [ ] **Step 4: Implement `scripts/record/files.ts`**

```ts
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { format, resolveConfig } from 'prettier'
import { z } from 'zod'
import { recordingSlug, type Recording } from '@/content/recording-schema'

// The total spend allowed for the whole project (ROADMAP Rule-0.1).
export const BUDGET_USD = 50

const RECORDINGS_DIR = ['content', 'recordings']
const JSON_EXT = '.json'

export function recordingPath(root: string, taskId: string, slug: string): string {
	return join(root, ...RECORDINGS_DIR, taskId, `${slug}${JSON_EXT}`)
}

const hashOnlySchema = z.object({ taskHash: z.string() })
const costOnlySchema = z.object({ totals: z.object({ costUsd: z.number().nullable() }) })

export function readRecordedHash(root: string, taskId: string, slug: string): string | null {
	const path = recordingPath(root, taskId, slug)
	if (!existsSync(path)) return null
	return hashOnlySchema.parse(JSON.parse(readFileSync(path, 'utf8'))).taskHash
}

/** Writes the recording, formatted by the repo's Prettier config so format:check passes. */
export async function writeRecording(root: string, recording: Recording): Promise<string> {
	const path = recordingPath(root, recording.taskId, recordingSlug(recording))
	const config = (await resolveConfig(path)) ?? {}
	const text = await format(JSON.stringify(recording), { ...config, filepath: path })
	mkdirSync(dirname(path), { recursive: true })
	writeFileSync(path, text)
	return path
}

/** What every recording on disk cost, against BUDGET_USD. */
export function recordedSpend(root: string): { costUsd: number; unknownPriceFiles: number } {
	const dir = join(root, ...RECORDINGS_DIR)
	if (!existsSync(dir)) return { costUsd: 0, unknownPriceFiles: 0 }
	let costUsd = 0
	let unknownPriceFiles = 0
	const files = readdirSync(dir, { recursive: true, encoding: 'utf8' }).filter((file) =>
		file.endsWith(JSON_EXT)
	)
	for (const file of files) {
		const { totals } = costOnlySchema.parse(JSON.parse(readFileSync(join(dir, file), 'utf8')))
		if (totals.costUsd === null) unknownPriceFiles += 1
		else costUsd += totals.costUsd
	}
	return { costUsd, unknownPriceFiles }
}
```

The test expects the written text to contain a tab-indented `"taskId"`: check `.prettierrc*` for `useTabs: true` first. If the repo indents JSON differently, change the test's expectation to match the repo's config, not the config.

- [ ] **Step 5: Implement `scripts/record/keys.ts`**

```ts
import { z } from 'zod'

// Owner-only keys (DESIGN 4.2, R22): read from .env.local by the recording
// CLI and nothing else. Never printed, logged, written or thrown.
const TYPESAFE_VAR = 'TYPESAFE_API_KEY'
const ANTHROPIC_VAR = 'ANTHROPIC_API_KEY'

const keySchema = z.string().min(1)

function read(env: Record<string, string | undefined>, name: string): string {
	const parsed = keySchema.safeParse(env[name])
	if (!parsed.success) {
		throw new Error(`${name} is not set in .env.local (see docs/api-setup-guide.md)`)
	}
	return parsed.data
}

export function ownerKeys(
	env: Record<string, string | undefined>,
	needs: { jev: boolean; llm: boolean }
): { typesafe: string | null; anthropic: string | null } {
	return {
		typesafe: needs.jev ? read(env, TYPESAFE_VAR) : null,
		anthropic: needs.llm ? read(env, ANTHROPIC_VAR) : null
	}
}
```

- [ ] **Step 6: Run the tests to see them pass**

Run: `corepack pnpm exec vitest run scripts/record`
Expected: PASS.

- [ ] **Step 7: Implement the entry `scripts/record.ts`**

```ts
// The recording CLI (DESIGN 4.2): `corepack pnpm record [--task <id>] [--model <id>] [--dry-run]`.
// Runs Jev and the Claude models through the shared runner and writes
// content/recordings/<taskId>/<slug>.json. Every real run costs money.
import { PRICES } from '@/content/prices'
import { taskHash } from '@/content/task-hash'
import { TASKS, getTask } from '@/content/tasks'
import { RACERS, RUN_EVENTS } from '@/lib/constants'
import { buildAnthropicBody, callAnthropic } from '@/runner/providers/anthropic'
import { callTypeSafe } from '@/runner/providers/typesafe'
import type { RunEvent } from '@/runner/types'
import { estimateTarget, LLM_OUTPUT_ALLOWANCE_TOKENS } from './record/estimate'
import { BUDGET_USD, readRecordedHash, recordedSpend, writeRecording } from './record/files'
import { ownerKeys } from './record/keys'
import { recordTarget, type ProviderCalls } from './record/record-target'
import { parseCliArgs, selectTargets, type Target } from './record/targets'

const ROOT = process.cwd()
const USD_DIGITS = 4

function usd(value: number | null): string {
	return value === null ? 'price unknown' : `$${value.toFixed(USD_DIGITS)}`
}

function label(target: Target): string {
	return `${target.taskId} / ${target.slug}`
}

function printCall(target: Target, event: RunEvent): void {
	if (event.type !== RUN_EVENTS.itemFinished) return
	const { result } = event
	const outcome =
		result.error ?? (result.ok ? (result.correct === false ? 'wrong' : 'ok') : 'unparsed')
	console.log(
		`  ${label(target)}  ${result.itemId}  lane ${event.lane}  ${Math.round(result.latencyMs)} ms  ${outcome}  ${usd(result.costUsd)}`
	)
}

function dryRun(targets: Target[]): void {
	let total = 0
	let unknown = false
	for (const target of targets) {
		const estimate = estimateTarget(getTask(target.taskId), target, PRICES)
		if (estimate.costUsd === null) unknown = true
		else total += estimate.costUsd
		console.log(
			`${label(target)}: ${estimate.calls} calls, ~${estimate.inputTokens} input tokens, ~${estimate.outputTokens} output tokens, ~${usd(estimate.costUsd)}`
		)
	}
	console.log(
		`\nEstimated total: ~${usd(total)}${unknown ? ' plus models with unknown price' : ''}.`
	)
	console.log(
		`Estimate: input = characters / 4; output = ${LLM_OUTPUT_ALLOWANCE_TOKENS} tokens per LLM call (an allowance, not a measurement). Nothing was spent.`
	)
}

async function record(targets: Target[]): Promise<void> {
	const keys = ownerKeys(process.env, {
		jev: targets.some((target) => target.racer === RACERS.jev),
		llm: targets.some((target) => target.racer === RACERS.llm)
	})
	const calls: ProviderCalls = {
		jev: (body, signal) => {
			if (!keys.typesafe) throw new Error('No TypeSafe key for a Jev run')
			return callTypeSafe(body, keys.typesafe, signal)
		},
		llm: (modelId, prompt, signal) => {
			if (!keys.anthropic) throw new Error('No Anthropic key for an LLM run')
			return callAnthropic(buildAnthropicBody(modelId, prompt), keys.anthropic, signal)
		}
	}
	const controller = new AbortController()
	process.once('SIGINT', () => controller.abort())

	let runCost = 0
	const written: string[] = []
	for (const target of targets) {
		console.log(`\nRecording ${label(target)}`)
		const recording = await recordTarget(getTask(target.taskId), target, {
			calls,
			prices: PRICES,
			recordedAt: new Date(),
			signal: controller.signal,
			onEvent: (event) => printCall(target, event)
		})
		const path = await writeRecording(ROOT, recording)
		written.push(`${recording.taskId}/${target.slug}.json`)
		runCost += recording.totals.costUsd ?? 0
		const { totals } = recording
		console.log(
			`Wrote ${path}: ${recording.modelId}, ${totals.correct}/${totals.scored} correct, ${Math.round(totals.wallMs)} ms, ${usd(totals.costUsd)}`
		)
	}

	const spend = recordedSpend(ROOT)
	console.log(`\nThis run: ${usd(runCost)}.`)
	console.log(
		`All recordings on disk: ${usd(spend.costUsd)} of the $${BUDGET_USD} budget${spend.unknownPriceFiles ? ` (${spend.unknownPriceFiles} with unknown price)` : ''}.`
	)
	if (written.length > 0) {
		console.log('\nAdd any new file to src/content/recordings.ts (registry.test.ts checks):')
		for (const file of written) console.log(`  content/recordings/${file}`)
	}
}

async function main(): Promise<void> {
	const args = parseCliArgs(process.argv.slice(2))
	const { run, skipped } = selectTargets(
		TASKS,
		args,
		(taskId, slug) => readRecordedHash(ROOT, taskId, slug),
		taskHash
	)
	for (const target of skipped) console.log(`Skip ${label(target)}: recording is current`)
	if (run.length === 0) {
		console.log('Nothing to record.')
		return
	}
	if (args.dryRun) dryRun(run)
	else await record(run)
}

main().catch((error: unknown) => {
	console.error(error instanceof Error ? error.message : error)
	process.exitCode = 1
})
```

- [ ] **Step 8: Smoke-test the entry with no tasks**

Run: `corepack pnpm record --dry-run`
Expected: prints `Nothing to record.` (there are no tasks yet) and exits 0.
Run: `corepack pnpm record --model gpt-9`
Expected: prints `Unknown model "gpt-9". Use one of: ...` and exits 1.

- [ ] **Step 9: Lint, typecheck, test**

Run: `corepack pnpm lint`, `corepack pnpm typecheck`, `corepack pnpm exec vitest run`. All pass.

- [ ] **Step 10: Commit**

```bash
git add scripts/record.ts scripts/record/record-target.ts scripts/record/record-target.test.ts scripts/record/files.ts scripts/record/files.test.ts scripts/record/keys.ts scripts/record/keys.test.ts
git commit -m "feat(record): add the recording cli"
```

---

### Task 3: Methodology page, footer link, docs

**Files:**

- Modify: `src/lib/links.ts` (add `methodology: '/methodology'`)
- Modify: `src/app/(app)/layout.tsx` (footer link next to Glossary)
- Create: `src/app/(app)/methodology/page.tsx`
- Create: `src/features/methodology/methodology-data.ts` (pure data assembly)
- Test: `src/features/methodology/methodology-data.test.ts`
- Modify: `e2e/shell.spec.ts` (Methodology test and screenshots)
- Modify: `.env.example` (owner-only keys section)
- Modify: `docs/api-setup-guide.md` (TypeSafe and Anthropic owner keys section)
- Modify: `CLAUDE.md` (Commands-table row for `record`; drop the "Step-6 adds `pnpm record`" sentence)
- Modify: `TECH-STACK.md` Recording CLI row: "re-records only changed items" becomes "skips tasks whose content is unchanged" (matches DESIGN 4.2)
- Modify: `DESIGN.md` 4.2: state the dry-run output allowance and the budget line

**Interfaces:**

- Consumes: `PRICES` (`@/content/prices`), `TASKS` (`@/content/tasks`), `currentRecordings` (`@/content/recordings`, server-only), `RACE_LANES`, `CLAUDE_MODELS`, `NOUL_THRESHOLD`, `ROUTES`, `SCORE_TOLERANCE` and `FIND_LINES_F1_BAR` (`@/runner/score`).
- Produces:
  - `ROUTES.methodology = '/methodology'`
  - `type PriceRow = { modelId: string; inputPerM: number; outputPerM: number; source: string }`
  - `type RecordingRow = { taskId: string; modelId: string; racer: Racer; recordedOn: string; items: number }` (`recordedOn` is the `YYYY-MM-DD` part of `recordedAt`)
  - `priceRows(table: PriceTable): PriceRow[]` (sorted by model id)
  - `recordingRows(recordings: Recording[]): RecordingRow[]` (sorted by task id, then Jev first, then model id)

- [ ] **Step 1: Write the failing test** `src/features/methodology/methodology-data.test.ts`

```ts
import { describe, expect, it } from 'vitest'
import type { Recording } from '@/content/recording-schema'
import { priceRows, recordingRows } from './methodology-data'

describe('priceRows', () => {
	it('lists every stored price, sorted by model id', () => {
		const rows = priceRows({
			checkedOn: '2026-10-01',
			models: {
				'jev-1.13.0': {
					inputPerM: 0.042,
					outputPerM: 0,
					source: 'https://docs.typesafe.ai/models'
				},
				'claude-opus-5-5': { inputPerM: 4, outputPerM: 20, source: 'https://example.com/p' }
			}
		})
		expect(rows.map((row) => row.modelId)).toEqual(['claude-opus-5-5', 'jev-1.13.0'])
		expect(rows[1]).toEqual({
			modelId: 'jev-1.13.0',
			inputPerM: 0.042,
			outputPerM: 0,
			source: 'https://docs.typesafe.ai/models'
		})
	})
})

describe('recordingRows', () => {
	const base = {
		taskHash: 'a'.repeat(64),
		price: null,
		lanes: 4,
		totals: {
			items: 2,
			scored: 2,
			correct: 2,
			accuracy: 1,
			wallMs: 1,
			costUsd: 0,
			inputTokens: 0,
			outputTokens: 0,
			parseFailures: 0
		},
		events: []
	}
	it('lists each recording with its date, Jev first within a task', () => {
		const recordings = [
			{
				...base,
				taskId: 'b',
				racer: 'llm',
				modelId: 'claude-opus-5-5',
				recordedAt: '2026-10-02T09:00:00.000Z'
			},
			{
				...base,
				taskId: 'a',
				racer: 'llm',
				modelId: 'claude-haiku-4-5-20251001',
				recordedAt: '2026-10-01T09:00:00.000Z'
			},
			{
				...base,
				taskId: 'a',
				racer: 'jev',
				modelId: 'jev-1.13.0',
				recordedAt: '2026-10-01T08:00:00.000Z'
			}
		] satisfies Omit<Recording, 'events'>[] & { events: [] }[]
		expect(recordingRows(recordings)).toEqual([
			{ taskId: 'a', racer: 'jev', modelId: 'jev-1.13.0', recordedOn: '2026-10-01', items: 2 },
			{
				taskId: 'a',
				racer: 'llm',
				modelId: 'claude-haiku-4-5-20251001',
				recordedOn: '2026-10-01',
				items: 2
			},
			{ taskId: 'b', racer: 'llm', modelId: 'claude-opus-5-5', recordedOn: '2026-10-02', items: 2 }
		])
	})
})
```

If the `satisfies` fixture does not type-check against `Recording` (its `events` needs at least one entry at the schema level, but the TS type is an array), type the fixtures as `Recording[]` directly; keep zero `as` casts.

- [ ] **Step 2: Run it to see it fail**

Run: `corepack pnpm exec vitest run src/features/methodology`
Expected: FAIL, module not found.

- [ ] **Step 3: Implement `src/features/methodology/methodology-data.ts`**

```ts
import type { PriceTable } from '@/content/prices'
import type { Recording } from '@/content/recording-schema'
import { RACERS, type Racer } from '@/lib/constants'

export type PriceRow = { modelId: string; inputPerM: number; outputPerM: number; source: string }
export type RecordingRow = {
	taskId: string
	racer: Racer
	modelId: string
	recordedOn: string
	items: number
}

// recordedAt is an ISO datetime; the page shows the date part.
const DATE_LENGTH = 'YYYY-MM-DD'.length

export function priceRows(table: PriceTable): PriceRow[] {
	return Object.entries(table.models)
		.map(([modelId, entry]) => ({ modelId, ...entry }))
		.sort((a, b) => a.modelId.localeCompare(b.modelId))
}

export function recordingRows(recordings: Recording[]): RecordingRow[] {
	return recordings
		.map((recording) => ({
			taskId: recording.taskId,
			racer: recording.racer,
			modelId: recording.modelId,
			recordedOn: recording.recordedAt.slice(0, DATE_LENGTH),
			items: recording.totals.items
		}))
		.sort(
			(a, b) =>
				a.taskId.localeCompare(b.taskId) ||
				Number(b.racer === RACERS.jev) - Number(a.racer === RACERS.jev) ||
				a.modelId.localeCompare(b.modelId)
		)
}
```

- [ ] **Step 4: Run the test to see it pass**

Run: `corepack pnpm exec vitest run src/features/methodology`
Expected: PASS.

- [ ] **Step 5: Add the route and the footer link**

`src/lib/links.ts`: add `methodology: '/methodology'` after `glossary`.
`src/app/(app)/layout.tsx`: after the Glossary `<Link>`, add a second `<Link href={ROUTES.methodology}>Methodology</Link>` with the same `className`. Extract the shared class string into a `const FOOTER_LINK` at the top of the file so it is not repeated.

- [ ] **Step 6: Build the page** `src/app/(app)/methodology/page.tsx`

A server component, static (no cookies, no headers, no `'use cache'` needed: content is imported). Match the Glossary page's structure and tokens (`text-text`, `text-text-muted`, `bg-surface`, `border-border`, `rounded-lg`, `max-w-3xl`). Metadata title: `"Methodology - Jev's Playground"`. Sections, each a `<section>` with an `<h2>`, in plain English, short sentences, no long dashes:

1. **Same inputs, same format** (R92): Jev and every LLM get the same state, the same instructions and the same options or levels for every item. The LLM is asked to reply with a fixed JSON object; Jev returns typed answers by design.
2. **How a race runs**: one call per item; every racer gets `{RACE_LANES}` parallel lanes (render the constant); each call is sent once, with no retries; latency is timed from sending the request to receiving the full response. Replays in Beginner mode play at the recorded latency.
3. **Model settings**: every LLM runs at its provider's default settings. Claude Opus 5.5 cannot turn its thinking off, so it runs at low effort, and its thinking tokens are counted in its cost. Render the model ids from `CLAUDE_MODELS`.
4. **Parsing and scoring** (R44): an answer that can't be parsed counts as a miss and is shown with a "couldn't parse" note, never hidden. A `<dl>` with one entry per rule, worded from DESIGN 3.2's table: Choice (the answer equals the correct option), Noul (Jev's probability at or above `{NOUL_THRESHOLD}` counts as yes), Score (Jev within `{SCORE_TOLERANCE}` of the correct level; the LLM's level equals it), several questions in one request (accuracy is the share answered right), finding lines (F1 of the lines found against the correct lines, correct at `{FIND_LINES_F1_BAR}` or more), text writing (shown, not scored).
5. **Cost**: tokens times the stored price per million tokens; Jev's output tokens are free; a failed call costs $0; a model with no stored price shows "price unknown" and is never estimated. Then a table from `priceRows(PRICES)`: Model, Input $/M, Output $/M, Source. Render the source as a link only when it starts with `https://docs.typesafe.ai/`; otherwise as plain text (CLAUDE.md: external links go only to TypeSafe docs). Caption: `Prices checked on {PRICES.checkedOn}.`
6. **How items are chosen** (spec 12.4): items and their correct answers are written for this site and checked by hand before recording. Some items are written to show a weakness TypeSafe documents. The same items are never re-run to get a different result: when content changes, it is recorded again and old recordings stop showing.
7. **Recordings**: a table from `recordingRows([...TASKS.keys()].flatMap(currentRecordings))`: Task, Model, Recorded on, Items. Empty state (a real state until recordings exist): `No recordings yet.` Recordings are real outputs and are never edited.

Use a `<table>` with a `<caption>` (visually styled as muted text), `<th scope="col">` headers, and `overflow-x-auto` on a wrapper so phones scroll the table, not the page.

- [ ] **Step 7: Add the e2e test and screenshots**

Read `e2e/shell.spec.ts` first and reuse its shared-account sign-in helper and screenshot loop. Add:

- A test: signed in, click the footer `Methodology` link, expect `/methodology`, expect the heading `Methodology` and the section headings `Same inputs, same format` and `Cost`.
- Add `/methodology` to the screenshot loop so it is captured in both themes at desktop and phone widths.

Run: `corepack pnpm test:e2e e2e/shell.spec.ts`
Expected: PASS. Open the new screenshots in `e2e/screenshots/` and check both themes and the phone width: no horizontal page scroll, tables readable.

- [ ] **Step 8: Docs**

`.env.example`, append:

```
# --- Recording CLI: owner's machine ONLY ---------------------------------
# Read only by `corepack pnpm record` (scripts/record/keys.ts), never by the
# app, and never added to Vercel. Fill them in only while recording, then
# delete them (spec R22). See docs/api-setup-guide.md section 4.
TYPESAFE_API_KEY=""
ANTHROPIC_API_KEY=""
```

`docs/api-setup-guide.md`: add a section `## 4. Recording keys (owner only)` before `## 4. Check the setup`, renumber that one to `## 5.`, and update any in-file references to the old number. Content: what the two keys are for (the recording CLI only), where to create them (TypeSafe: the TypeSafe dashboard per `docs.typesafe.ai`; Anthropic: `https://platform.claude.com/settings/keys`), paste them into `.env.local` as `TYPESAFE_API_KEY` and `ANTHROPIC_API_KEY`, run `corepack pnpm record --dry-run` first, and delete both values from `.env.local` when recording is done (R22). Never paste a key into a chat (`.claude-logs/` commits every prompt).

`CLAUDE.md` Commands table: add a row `| \`record\` | Record Jev and the three Claude models for tasks whose content changed (\`--task\`, \`--model\`, \`--dry-run\`). Costs money; dry-run first. |`and delete the sentence "Step-6 adds`pnpm record`(the recording CLI); add its row here when it exists." Run`corepack pnpm format` so the table re-aligns.

`TECH-STACK.md` Recording CLI row: replace "re-records only changed items" with "skips tasks whose content is unchanged".

`DESIGN.md` 4.2: change the `--dry-run` bullet to: "`--dry-run` estimates input tokens (characters / 4) times price, plus an output allowance of 500 tokens per LLM call, and spends nothing." Change "A real run prints each call and the total cost against the $50 budget." to "A real run prints each call, then this run's cost and the cost of every recording on disk against the $50 budget."

- [ ] **Step 9: Gates**

Run: `corepack pnpm lint`, `corepack pnpm typecheck`, `corepack pnpm format:check`, `corepack pnpm check:env`, `corepack pnpm test`, `corepack pnpm build`. All pass; the build lists `/methodology` as a static route.

- [ ] **Step 10: Commit**

```bash
git add src/lib/links.ts "src/app/(app)/layout.tsx" "src/app/(app)/methodology/page.tsx" src/features/methodology e2e/shell.spec.ts .env.example docs/api-setup-guide.md CLAUDE.md TECH-STACK.md DESIGN.md
git commit -m "feat(methodology): add the methodology page and footer link"
```

---

### Task 4: Speed Race task and its first recording (main agent, with the user)

Not a subagent task: it needs the user's spot-check and spending approval.

**Files:**

- Create: `content/tasks/speed-race.json`
- Modify: `src/content/tasks.ts` (import it into `RAW_TASKS`)
- Create (by the CLI): `content/recordings/speed-race/{jev,claude-haiku-4-5-20251001,claude-sonnet-5-5,claude-opus-5-5}.json`
- Modify: `src/content/recordings.ts` (import the four files into `RAW_RECORDINGS`)

- [ ] **Step 1:** Draft the 40 tickets in `.superpowers/speed-race.draft.json` (git-ignored, so the suite stays green) in the Task shape: `{ "id": "speed-race", "kind": "choice", "version": 1, "jev": { "questions": { "answer": { "type": "choice", "instructions": "Which team should handle this support ticket?", "criteria": { "billing": "...", "technical": "...", "account": "...", "shipping": "...", "feature_request": "..." } } } }, "items": [{ "id": "t01", "state": "<ticket text>", "label": "<category>" }, ...] }`, 8 per category, shuffled order.
- [ ] **Step 2:** Ask the user to spot-check the draft (AskUserQuestion with the path and what to look for). Apply their changes.
- [ ] **Step 3:** Move it to `content/tasks/speed-race.json`, add it to `src/content/tasks.ts`. Run `corepack pnpm exec vitest run src/content/task-schema.test.ts src/content/tasks.test.ts` (the registry test now fails until recordings exist; expected).
- [ ] **Step 4:** Run `corepack pnpm record --task speed-race --dry-run`. Show the user the estimate and ask for approval (AskUserQuestion). The user adds `TYPESAFE_API_KEY` and `ANTHROPIC_API_KEY` to `.env.local` themselves.
- [ ] **Step 5:** On approval, run `corepack pnpm record --task speed-race`. Report the printed per-call lines, totals and budget line faithfully, including failures.
- [ ] **Step 6:** Add the four recordings to `src/content/recordings.ts`. Run `corepack pnpm test`: the registry test passes. Check the lesson shows (Jev clearly faster and cheaper). If it does not, report to the user (DESIGN 1: items may be rewritten to target a documented weakness and recorded once more; never re-run the same items).
- [ ] **Step 7:** Start `corepack pnpm dev`, open `/methodology` in Chrome (Claude-in-Chrome), confirm the recordings table lists the four recordings in both themes.
- [ ] **Step 8:** Commit `feat(content): add the speed race task and its recordings`.
