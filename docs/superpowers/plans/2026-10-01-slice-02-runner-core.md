# Slice 2 - Runner Core Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The shared runner in `src/runner/` and the content loaders in `src/content/`: the Task schema, `content/prices.json`, the TypeSafe and Anthropic providers, `jev-request`, `llm-prompt`, parse, score, cost, totals, the `runItems` lane scheduler, the Code racer, `combine`, `replaySource`, `taskHash` and the task and recording registries. No UI.

**Architecture:** Plain TypeScript with no React, no Node-only APIs (except `src/content/task-hash.ts` and the server-only recordings registry), so the browser (Developer mode, slice 8) and the recording CLI (slice 3) share one code path (R92). Every racer is an `ItemRunner` (`(item, signal) => Promise<ItemResult>`); provider calls are injected as functions so keys stay in the caller's closure and tests never touch the network. `runItems` and `replaySource` both emit the same `RunEvent` stream; `createCombineTap` derives the `jev_code` racer from Jev's events in both modes.

**Tech Stack:** TypeScript strict (`noUncheckedIndexedAccess`), Zod 4 (`z.enum(enumLikeObject)`, `z.strictObject`, `z.looseObject`, `z.iso.date()`, `z.iso.datetime()`, `z.url()`), plain `fetch` with `performance.now()`, Vitest (jsdom) with `vi.stubGlobal` and fake timers, `node:crypto` for the task hash.

**Spec:** `DESIGN.md` sections 1, 2, 3.1, 3.2, 4.1, 12 (provider errors), 14, 16 (slice 2); `spec.md` 2.2 (TypeSafe API), 3.2/3.3, R7, R44, R92; `TECH-STACK.md` (prices); `CLAUDE.md` product guardrails.

## User rulings for this slice (2026-10-01)

- `ItemResult` gains `credit` (0 to 1): 1 or 0 for most items, the share right for `fan_out`. `correct` is `credit === 1`. Accuracy is total credit over scored items.
- Code racer scope: the Code racer and `combine` machinery plus the functions DESIGN names: `count_true`, `compare_dates` (combine and Code racer) and `weighted_composite`. Content-specific Code functions arrive with their content slice.
- Content is loaded through explicit import registries; a Vitest test fails when a file on disk is missing from a registry.
- Only the direct TypeSafe call is built now. The `/api/jev` pass-through and its `Server-Timing` latency arrive in slice 8.

## Verified facts (2026-10-01)

- TypeSafe (`docs.typesafe.ai/api`): `POST https://api.typesafe.ai/v1/systemone`, `Authorization: Bearer <key>`. Body `{ model, state, questions }`. Response `{ model: 'jev-1.13.0', answers: { [key]: answer }, usage: { input_tokens, output_tokens } }`. Noul answer `{ type: 'noul', noul }`; Choice `{ type: 'choice', choice, probabilities, confidence }`; Score `{ type: 'score', score, legend, probabilities, confidence }`. Errors: 401, 422, 429, 529. Choice 2-255 options (API max 255), Score 2-10 levels.
- TypeSafe price (`docs.typesafe.ai/models`): Jev 1.13 (`jev-1.13.0`) $0.042 per million input tokens; output tokens are free.
- Anthropic (`platform.claude.com/docs/en/about-claude/pricing`): Opus 5.5 $4/$20, Sonnet 5.5 $2/$10, Haiku 4.5 $1/$5 per million input/output tokens. Messages API `POST https://api.anthropic.com/v1/messages`, headers `x-api-key`, `anthropic-version: 2023-06-01`, `anthropic-dangerous-direct-browser-access: true`. Response `{ model, content: [{ type, text? }], usage: { input_tokens, output_tokens } }`; thinking tokens are billed inside `output_tokens`. Opus 5.5 can't disable thinking; effort goes in `output_config: { effort: 'low' }`. Sonnet 5.5 and Haiku 4.5 run at provider defaults (no `thinking`, no `output_config`).

## Global Constraints

- Run every package script as `corepack pnpm <script>` (pnpm is not on PATH). Vitest alone: `corepack pnpm exec vitest run <path>`.
- No emojis anywhere. No long dashes in code, comments or docs: use a single hyphen "-".
- No `any`, and avoid `as` type assertions (the `typesafe` skill audits them); narrow with type guards or Zod instead.
- Enum-like values come from `src/lib/constants.ts`, never repeated as inline literals in `src/runner/` or `src/content/` code. Test fixtures mirror content JSON and may use string literals.
- No magic numbers: name every threshold and limit as a `const`.
- Never `console.*` in `src/`.
- `src/runner/` must not import React, Next.js, `server-only`, `node:*` or anything under `src/server/`. It runs in the browser and in the CLI.
- Never put an API key in a URL, an error message, a thrown error's text, a stored result or a log. Google keys (later slices) go in `x-goog-api-key`.
- One request per call: no retries anywhere in provider code (R7).
- A parse failure or a provider error is a miss (credit 0 when the item is scorable) and keeps its `raw` text (R44). Never invent or edit a result.
- Tests: Vitest files are `*.test.ts` under `src/`. Test fixtures are not product content (ROADMAP Rule-5 covers product content only).
- Commits: Conventional Commits, header 72 characters or less, ending with the two lines:
  `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` and `Claude-Session: https://claude.ai/code/session_01Vme75YtvfRzT3i2uXgd6TQ`. Commit straight to `main` (user decision from slice 1). Do not push.

---

### Task 1: Constants, the Task schema and prices

**Files:**

- Modify: `src/lib/constants.ts`
- Create: `src/content/task-schema.ts`
- Create: `src/content/prices.ts`
- Create: `content/prices.json`
- Create: `src/runner/testing/tasks.ts` (test fixtures shared by later tasks)
- Test: `src/content/task-schema.test.ts`, `src/content/prices.test.ts`

**Interfaces:**

- Produces (constants): `RACERS.jevCode = 'jev_code'`, `TASK_KINDS`/`TaskKind`, `PROVIDER_ERROR_KINDS`/`ProviderErrorKind`, `RUN_EVENTS`, `CODE_FN_IDS`/`CodeFnId`, `COMBINE_FN_IDS`/`CombineFnId`, `DATE_ORDER`/`DateOrder`, `ANSWER_KEY = 'answer'`, `JEV_MODEL_ALIAS = 'jev-latest'`, `RACE_LANES = 4`, `NOUL_THRESHOLD = 0.5`.
- Produces (task schema): `structuredSchema`/`Structured`, `questionSchema`/`Question`, `noulQuestionSchema`/`NoulQuestion`, `rawQuestionSchema`/`RawQuestion`, `labelSchema`/`Label`, `taskItemSchema`/`TaskItem`, `taskSchema`/`Task`, `taskProblems(task): Problem[]`, `isQuestion(template)`, `linesOf(state): string[] | null`, `answerQuestion(task): Question | null`.
- Produces (prices): `priceEntrySchema`/`PriceEntry` (`{ inputPerM, outputPerM, source }`), `priceTableSchema`/`PriceTable`, `PRICES`.
- Produces (fixtures): `choiceTask`, `noulTask`, `scoreTask`, `fanOutTask`, `findLinesTask`, `generateTask`, `countTask`, `datesTask`, `compositeTask`, `codeDatesTask`, `item(task, id)`.

- [ ] **Step 1: Add the constants**

Append to `src/lib/constants.ts`, and change the existing `RACERS` line (keep the existing `Racer` type line):

```ts
// jev_code: Jev's answer passed through a Code function, shown as "Jev + Code" (DESIGN 3.2).
export const RACERS = { jev: 'jev', llm: 'llm', code: 'code', jevCode: 'jev_code' } as const
```

```ts
// What a Task asks and how its answers are scored (DESIGN 3.2).
export const TASK_KINDS = {
	choice: 'choice',
	noul: 'noul',
	score: 'score',
	fanOut: 'fan_out',
	findLines: 'find_lines',
	generate: 'generate'
} as const
export type TaskKind = (typeof TASK_KINDS)[keyof typeof TASK_KINDS]

// Every provider failure maps to one of these (DESIGN 12).
export const PROVIDER_ERROR_KINDS = {
	invalidKey: 'invalid_key',
	forbidden: 'forbidden',
	rateLimited: 'rate_limited',
	overloaded: 'overloaded',
	malformed: 'malformed',
	network: 'network',
	unknown: 'unknown'
} as const
export type ProviderErrorKind = (typeof PROVIDER_ERROR_KINDS)[keyof typeof PROVIDER_ERROR_KINDS]

export const RUN_EVENTS = {
	itemStarted: 'item_started',
	itemFinished: 'item_finished',
	runFinished: 'run_finished'
} as const

// Code racer functions: item state in, answer out.
export const CODE_FN_IDS = { compareDates: 'compare_dates' } as const
export type CodeFnId = (typeof CODE_FN_IDS)[keyof typeof CODE_FN_IDS]

// combine functions: Jev's answers in, answer out (DESIGN 3.2).
export const COMBINE_FN_IDS = {
	countTrue: 'count_true',
	compareDates: 'compare_dates',
	weightedComposite: 'weighted_composite'
} as const
export type CombineFnId = (typeof COMBINE_FN_IDS)[keyof typeof COMBINE_FN_IDS]

// Option keys for "which date comes first?" tasks.
export const DATE_ORDER = { first: 'first', second: 'second', same: 'same' } as const
export type DateOrder = (typeof DATE_ORDER)[keyof typeof DATE_ORDER]

// The key of the one question in a choice, noul or score task, and of the
// answer field in the LLM's JSON reply.
export const ANSWER_KEY = 'answer'

// The alias every Jev request sends; the response names the version that answered.
export const JEV_MODEL_ALIAS = 'jev-latest'

// Every racer gets the same number of parallel lanes (DESIGN 1).
export const RACE_LANES = 4

// A Noul at or above this counts as yes (DESIGN 3.2).
export const NOUL_THRESHOLD = 0.5
```

- [ ] **Step 2: Write the shared test fixtures**

`src/runner/testing/tasks.ts`:

```ts
import { taskSchema, type Task, type TaskItem } from '@/content/task-schema'

// Small, valid Tasks for runner tests. Not product content (ROADMAP Rule-5).

export const choiceTask: Task = taskSchema.parse({
	id: 'test-choice',
	kind: 'choice',
	version: 1,
	jev: {
		questions: {
			answer: {
				type: 'choice',
				instructions: 'Which team should handle this ticket?',
				criteria: {
					billing: 'Payments, invoices, refunds',
					technical: 'Bugs and outages',
					sales: null
				}
			}
		}
	},
	items: [
		{ id: 't1', state: 'My invoice is wrong.', label: 'billing' },
		{ id: 't2', state: 'The app crashes on login.', label: 'technical' },
		{ id: 't3', state: 'Do you offer a team plan?' }
	]
})

export const noulTask: Task = taskSchema.parse({
	id: 'test-noul',
	kind: 'noul',
	version: 1,
	jev: {
		questions: {
			answer: {
				type: 'noul',
				instructions: 'Is the customer upset?',
				criteria: { true: 'Upset or angry', false: 'Calm' }
			}
		}
	},
	items: [
		{ id: 'n1', state: 'This is the third time it broke!', label: true },
		{ id: 'n2', state: 'Thanks for the quick fix.', label: false }
	]
})

export const scoreTask: Task = taskSchema.parse({
	id: 'test-score',
	kind: 'score',
	version: 1,
	jev: {
		questions: {
			answer: {
				type: 'score',
				instructions: 'How frustrated is the customer?',
				criteria: ['Calm', 'Annoyed', 'Angry']
			}
		}
	},
	items: [
		{ id: 's1', state: 'I want a refund NOW.', label: 2 },
		{ id: 's2', state: 'All good, thanks.', label: 0 }
	]
})

export const fanOutTask: Task = taskSchema.parse({
	id: 'test-fan-out',
	kind: 'fan_out',
	version: 1,
	jev: {
		questions: {
			urgent: { type: 'noul', instructions: 'Is it urgent?' },
			refund: { type: 'noul', instructions: 'Does it ask for a refund?' }
		}
	},
	items: [
		{ id: 'f1', state: 'Refund me now!', label: { urgent: true, refund: true } },
		{
			id: 'f2',
			state: ['apple', 'chair'],
			questions: {
				a: { type: 'noul', instructions: 'Is the first entry a fruit?' },
				b: { type: 'noul', instructions: 'Is the second entry a fruit?' }
			},
			label: { a: true, b: false }
		}
	]
})

export const findLinesTask: Task = taskSchema.parse({
	id: 'test-find-lines',
	kind: 'find_lines',
	version: 1,
	jev: { perLine: { instructions: 'Does `line` mention a deadline?' } },
	items: [
		{
			id: 'd1',
			state: ['Hello team', 'Due by Friday', 'Thanks', 'Submit before noon'],
			label: [2, 4]
		}
	]
})

export const generateTask: Task = taskSchema.parse({
	id: 'test-generate',
	kind: 'generate',
	version: 1,
	jev: { raw: { poem: { type: 'text', instructions: 'Write a 4-line poem about the state.' } } },
	llm: { instructions: 'Write a 4-line poem about the state.' },
	items: [{ id: 'g1', state: 'the sea' }]
})

export const countTask: Task = taskSchema.parse({
	id: 'test-count',
	kind: 'choice',
	version: 1,
	combine: 'count_true',
	jev: { questions: { entry: { type: 'noul', instructions: 'Is this entry a fruit?' } } },
	llm: {
		type: 'choice',
		instructions: 'How many fruits are in the list?',
		criteria: { '0': null, '1': null, '2': null, '3': null }
	},
	items: [
		{
			id: 'c1',
			state: ['apple', 'chair', 'pear'],
			questions: {
				e1: { type: 'noul', instructions: 'Is "apple" a fruit?' },
				e2: { type: 'noul', instructions: 'Is "chair" a fruit?' },
				e3: { type: 'noul', instructions: 'Is "pear" a fruit?' }
			},
			label: '2'
		}
	]
})

const DAY_OPTIONS = { '3': null, '4': null }
const MONTH_OPTIONS = { '3': null, '4': null }
const YEAR_OPTIONS = { '2024': null, '2025': null }

export const datesTask: Task = taskSchema.parse({
	id: 'test-dates',
	kind: 'choice',
	version: 1,
	combine: 'compare_dates',
	jev: {
		questions: {
			first_day: { type: 'choice', instructions: 'Day of the first date?', criteria: DAY_OPTIONS },
			first_month: {
				type: 'choice',
				instructions: 'Month of the first date?',
				criteria: MONTH_OPTIONS
			},
			first_year: {
				type: 'choice',
				instructions: 'Year of the first date?',
				criteria: YEAR_OPTIONS
			},
			second_day: {
				type: 'choice',
				instructions: 'Day of the second date?',
				criteria: DAY_OPTIONS
			},
			second_month: {
				type: 'choice',
				instructions: 'Month of the second date?',
				criteria: MONTH_OPTIONS
			},
			second_year: {
				type: 'choice',
				instructions: 'Year of the second date?',
				criteria: YEAR_OPTIONS
			}
		}
	},
	llm: {
		type: 'choice',
		instructions: 'Which date comes first?',
		criteria: { first: null, second: null, same: null }
	},
	items: [
		{ id: 'x1', state: { first: '03/04/2025, day first', second: '4 March 2025' }, label: 'same' }
	]
})

export const compositeTask: Task = taskSchema.parse({
	id: 'test-composite',
	kind: 'noul',
	version: 1,
	combine: 'weighted_composite',
	jev: {
		questions: {
			quality: { type: 'noul', instructions: 'Does it praise the quality?' },
			price: { type: 'noul', instructions: 'Does it praise the price?' }
		}
	},
	llm: { type: 'noul', instructions: 'Is this a positive product review?' },
	items: [{ id: 'r1', state: 'Great build, but far too expensive.', label: true }]
})

export const codeDatesTask: Task = taskSchema.parse({
	id: 'test-code-dates',
	kind: 'choice',
	version: 1,
	code: 'compare_dates',
	jev: {
		questions: {
			answer: {
				type: 'choice',
				instructions: 'Which date comes first?',
				criteria: { first: null, second: null, same: null }
			}
		}
	},
	items: [{ id: 'k1', state: { first: '2025-03-04', second: '2025-04-03' }, label: 'first' }]
})

/** The item with this id; throws so a typo fails the test loudly. */
export function item(task: Task, id: string): TaskItem {
	const found = task.items.find((candidate) => candidate.id === id)
	if (!found) throw new Error(`No item ${id} in ${task.id}`)
	return found
}
```

- [ ] **Step 3: Write the failing schema tests**

`src/content/task-schema.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { answerQuestion, linesOf, taskSchema } from './task-schema'
import {
	choiceTask,
	codeDatesTask,
	compositeTask,
	countTask,
	datesTask,
	fanOutTask,
	findLinesTask,
	generateTask,
	noulTask,
	scoreTask
} from '@/runner/testing/tasks'

// A valid choice task as plain JSON, mutated per test.
function choiceJson(): Record<string, unknown> {
	return JSON.parse(JSON.stringify(choiceTask))
}

function messages(input: unknown): string[] {
	const result = taskSchema.safeParse(input)
	return result.success ? [] : result.error.issues.map((issue) => issue.message)
}

describe('taskSchema', () => {
	it('accepts one valid task of every kind and shape', () => {
		for (const task of [
			choiceTask,
			noulTask,
			scoreTask,
			fanOutTask,
			findLinesTask,
			generateTask,
			countTask,
			datesTask,
			compositeTask,
			codeDatesTask
		]) {
			expect(messages(task), task.id).toEqual([])
		}
	})

	it('rejects a choice label that is not an option', () => {
		const task = choiceJson()
		task.items = [{ id: 't1', state: 'x', label: 'marketing' }]
		expect(messages(task).join()).toMatch(/option/i)
	})

	it('rejects duplicate item ids', () => {
		const task = choiceJson()
		task.items = [
			{ id: 't1', state: 'x', label: 'billing' },
			{ id: 't1', state: 'y', label: 'sales' }
		]
		expect(messages(task).join()).toMatch(/Duplicate item id/)
	})

	it('rejects a single-question task whose Jev question is not named "answer"', () => {
		const task = choiceJson()
		task.jev = {
			questions: { team: { type: 'choice', instructions: 'Team?', criteria: { a: null, b: null } } }
		}
		task.items = [{ id: 't1', state: 'x' }]
		expect(messages(task).join()).toMatch(/"answer"/)
	})

	it('rejects a Choice with fewer than 2 options', () => {
		const task = choiceJson()
		task.jev = {
			questions: { answer: { type: 'choice', instructions: 'Team?', criteria: { a: null } } }
		}
		task.items = [{ id: 't1', state: 'x' }]
		expect(messages(task).join()).toMatch(/2 to 255 options/)
	})

	it('rejects a score label outside the levels', () => {
		const task = JSON.parse(JSON.stringify(scoreTask))
		task.items = [{ id: 's1', state: 'x', label: 3 }]
		expect(messages(task).join()).toMatch(/level/i)
	})

	it('rejects a label of the wrong type for the kind', () => {
		const task = JSON.parse(JSON.stringify(noulTask))
		task.items = [{ id: 'n1', state: 'x', label: 'yes' }]
		expect(messages(task).join()).toMatch(/true or false/)
	})

	it('rejects fan_out labels whose keys differ from the questions', () => {
		const task = JSON.parse(JSON.stringify(fanOutTask))
		task.items = [{ id: 'f1', state: 'x', label: { urgent: true } }]
		expect(messages(task).join()).toMatch(/every question/)
	})

	it('rejects find_lines labels past the last line', () => {
		const task = JSON.parse(JSON.stringify(findLinesTask))
		task.items = [{ id: 'd1', state: ['a', 'b'], label: [3] }]
		expect(messages(task).join()).toMatch(/line/i)
	})

	it('rejects a find_lines state that is not an array of lines', () => {
		const task = JSON.parse(JSON.stringify(findLinesTask))
		task.items = [{ id: 'd1', state: 'one line' }]
		expect(messages(task).join()).toMatch(/array of lines/)
	})

	it('rejects a label on a generate item', () => {
		const task = JSON.parse(JSON.stringify(generateTask))
		task.items = [{ id: 'g1', state: 'x', label: 'poem' }]
		expect(messages(task).join()).toMatch(/not scored/)
	})

	it('rejects combine without an llm question', () => {
		const task = JSON.parse(JSON.stringify(countTask))
		delete task.llm
		expect(messages(task).join()).toMatch(/llm question/)
	})

	it('rejects raw questions outside a generate task', () => {
		const task = choiceJson()
		task.jev = { raw: { answer: { type: 'text', instructions: 'x' } } }
		expect(messages(task).join()).toMatch(/generate/)
	})

	it('rejects per-item questions on a plain choice task', () => {
		const task = choiceJson()
		task.items = [{ id: 't1', state: 'x', questions: { q: { type: 'noul', instructions: 'x' } } }]
		expect(messages(task).join()).toMatch(/questions/)
	})
})

describe('answerQuestion', () => {
	it("is Jev's answer question, or the llm question when the task combines", () => {
		expect(answerQuestion(choiceTask)?.instructions).toBe('Which team should handle this ticket?')
		expect(answerQuestion(countTask)?.instructions).toBe('How many fruits are in the list?')
		expect(answerQuestion(fanOutTask)).toBeNull()
	})
})

describe('linesOf', () => {
	it('returns the lines of an array of strings, otherwise null', () => {
		expect(linesOf(['a', 'b'])).toEqual(['a', 'b'])
		expect(linesOf('a')).toBeNull()
		expect(linesOf(['a', 1])).toBeNull()
	})
})
```

`src/content/prices.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { CLAUDE_MODELS } from '@/lib/constants'
import { PRICES } from './prices'

describe('PRICES', () => {
	it('prices Jev and the three Claude models with a dated source', () => {
		expect(PRICES.checkedOn).toMatch(/^\d{4}-\d{2}-\d{2}$/)
		for (const modelId of ['jev-1.13.0', ...Object.values(CLAUDE_MODELS)]) {
			const entry = PRICES.models[modelId]
			expect(entry, modelId).toBeDefined()
			expect(entry?.source).toMatch(/^https:\/\//)
		}
	})

	it('charges nothing for Jev output tokens', () => {
		expect(PRICES.models['jev-1.13.0']?.outputPerM).toBe(0)
	})
})
```

- [ ] **Step 4: Run them to verify they fail**

Run: `corepack pnpm exec vitest run src/content/task-schema.test.ts src/content/prices.test.ts`
Expected: FAIL (modules not found).

- [ ] **Step 5: Write the Task schema**

`src/content/task-schema.ts`:

```ts
import { z } from 'zod'
import {
	ANSWER_KEY,
	CODE_FN_IDS,
	COMBINE_FN_IDS,
	QUESTION_KINDS,
	TASK_KINDS,
	type TaskKind
} from '@/lib/constants'

// TypeSafe takes a string, an object or an array wherever it takes text
// (docs.typesafe.ai/api, checked 2026-10-01).
export const structuredSchema = z.union([
	z.string().min(1),
	z.record(z.string(), z.unknown()),
	z.array(z.unknown())
])
export type Structured = z.infer<typeof structuredSchema>

// API limits from docs.typesafe.ai/api.
const MIN_CHOICE_OPTIONS = 2
const MAX_CHOICE_OPTIONS = 255
const MIN_SCORE_LEVELS = 2
const MAX_SCORE_LEVELS = 10

const noulCriteriaSchema = z.object({ true: structuredSchema, false: structuredSchema }).partial()

export const noulQuestionSchema = z.object({
	type: z.literal(QUESTION_KINDS.noul),
	instructions: structuredSchema,
	criteria: noulCriteriaSchema.optional()
})
export type NoulQuestion = z.infer<typeof noulQuestionSchema>

export const choiceQuestionSchema = z.object({
	type: z.literal(QUESTION_KINDS.choice),
	instructions: structuredSchema,
	criteria: z.record(z.string().min(1), structuredSchema.nullable()).refine((criteria) => {
		const count = Object.keys(criteria).length
		return count >= MIN_CHOICE_OPTIONS && count <= MAX_CHOICE_OPTIONS
	}, `A Choice needs ${MIN_CHOICE_OPTIONS} to ${MAX_CHOICE_OPTIONS} options`)
})

export const scoreQuestionSchema = z.object({
	type: z.literal(QUESTION_KINDS.score),
	instructions: structuredSchema,
	criteria: z.array(structuredSchema).min(MIN_SCORE_LEVELS).max(MAX_SCORE_LEVELS)
})

export const questionSchema = z.discriminatedUnion('type', [
	noulQuestionSchema,
	choiceQuestionSchema,
	scoreQuestionSchema
])
export type Question = z.infer<typeof questionSchema>

// Level 2 sends a question type TypeSafe does not offer, so the real error is
// recorded and shown (DESIGN 7). Only generate tasks may send these.
export const rawQuestionSchema = z.looseObject({
	type: z.string().min(1),
	instructions: structuredSchema
})
export type RawQuestion = z.infer<typeof rawQuestionSchema>

const questionMapSchema = z
	.record(z.string().min(1), questionSchema)
	.refine((map) => Object.keys(map).length > 0, 'At least one question')

export const jevTemplateSchema = z.union([
	z.strictObject({ questions: questionMapSchema }),
	// find_lines: one Noul per line of the item's state (DESIGN 8, Needle Hunt).
	z.strictObject({
		perLine: z.strictObject({
			instructions: structuredSchema,
			criteria: noulCriteriaSchema.optional()
		})
	}),
	z.strictObject({ raw: z.record(z.string().min(1), rawQuestionSchema) })
])

// The LLM's question. Left out, it is derived from Jev's questions, so both
// racers get the same instructions and options (R92). A task with combine
// sets it, because Jev answers smaller questions there.
export const llmTemplateSchema = z.union([
	questionSchema,
	z.strictObject({ instructions: structuredSchema })
])
type LlmTemplate = z.infer<typeof llmTemplateSchema>

export const labelSchema = z.union([
	z.string().min(1), // choice: the option key
	z.boolean(), // noul
	z.number().int().nonnegative(), // score: the level index
	z.record(z.string(), z.boolean()), // fan_out: one boolean per question
	z.array(z.number().int().positive()) // find_lines: 1-based line numbers
])
export type Label = z.infer<typeof labelSchema>

export const taskItemSchema = z.object({
	id: z.string().min(1),
	state: structuredSchema,
	// Left out, the item is "not scored" (DESIGN 3.2).
	label: labelSchema.optional(),
	note: z.string().min(1).optional(),
	// Questions that differ per item (level 3: one Noul per list entry).
	questions: questionMapSchema.optional()
})
export type TaskItem = z.infer<typeof taskItemSchema>

const taskObjectSchema = z.object({
	id: z.string().regex(/^[a-z0-9-]+$/),
	kind: z.enum(TASK_KINDS),
	version: z.number().int().positive(),
	jev: jevTemplateSchema,
	llm: llmTemplateSchema.optional(),
	code: z.enum(CODE_FN_IDS).optional(),
	combine: z.enum(COMBINE_FN_IDS).optional(),
	items: z.array(taskItemSchema).min(1)
})
export type Task = z.infer<typeof taskObjectSchema>

const SINGLE_KINDS: ReadonlySet<TaskKind> = new Set([
	TASK_KINDS.choice,
	TASK_KINDS.noul,
	TASK_KINDS.score
])

export function isQuestion(template: LlmTemplate): template is Question {
	return 'type' in template
}

/** The lines of a find_lines state, or null when it is not an array of strings. */
export function linesOf(state: Structured): string[] | null {
	if (!Array.isArray(state)) return null
	const lines: string[] = []
	for (const line of state) {
		if (typeof line !== 'string') return null
		lines.push(line)
	}
	return lines
}

/** The question a choice, noul or score label answers: the LLM's on a combine task, Jev's otherwise. */
export function answerQuestion(task: Task): Question | null {
	if (task.llm && isQuestion(task.llm)) return task.llm
	if (!SINGLE_KINDS.has(task.kind) || !('questions' in task.jev)) return null
	return task.jev.questions[ANSWER_KEY] ?? null
}

type Problem = { message: string; path: (string | number)[] }

function isRecordLabel(label: Label): label is Record<string, boolean> {
	return typeof label === 'object' && !Array.isArray(label)
}

function sameKeys(a: Record<string, unknown>, b: Record<string, unknown>): boolean {
	const keysA = Object.keys(a).sort()
	const keysB = Object.keys(b).sort()
	return keysA.length === keysB.length && keysA.every((key, index) => key === keysB[index])
}

function itemProblems(task: Task, item: TaskItem): string[] {
	const problems: string[] = []
	const { label } = item
	if (item.questions && task.kind !== TASK_KINDS.fanOut && !task.combine) {
		problems.push('Only fan_out and combine items may set their own questions')
	}
	const question = answerQuestion(task)

	switch (task.kind) {
		case TASK_KINDS.choice: {
			if (label === undefined) break
			if (typeof label !== 'string') problems.push('A choice label is an option key')
			else if (question?.type === QUESTION_KINDS.choice && !(label in question.criteria)) {
				problems.push(`Label "${label}" is not an option`)
			}
			break
		}
		case TASK_KINDS.noul: {
			if (label !== undefined && typeof label !== 'boolean') {
				problems.push('A noul label is true or false')
			}
			break
		}
		case TASK_KINDS.score: {
			if (label === undefined) break
			if (typeof label !== 'number') problems.push('A score label is a level number')
			else if (question?.type === QUESTION_KINDS.score && label >= question.criteria.length) {
				problems.push(`Label ${label} is past the last level`)
			}
			break
		}
		case TASK_KINDS.fanOut: {
			const questions = item.questions ?? ('questions' in task.jev ? task.jev.questions : {})
			if (Object.values(questions).some((q) => q.type !== QUESTION_KINDS.noul)) {
				problems.push('fan_out questions must all be Nouls')
			}
			if (label === undefined) break
			if (!isRecordLabel(label) || !sameKeys(label, questions)) {
				problems.push('A fan_out label has one boolean for every question')
			}
			break
		}
		case TASK_KINDS.findLines: {
			const lines = linesOf(item.state)
			if (!lines) {
				problems.push('A find_lines state is an array of lines')
				break
			}
			if (label === undefined) break
			if (!Array.isArray(label) || label.some((line) => line > lines.length)) {
				problems.push('find_lines labels are line numbers within the state')
			}
			break
		}
		case TASK_KINDS.generate: {
			if (label !== undefined) problems.push('generate items are not scored')
			break
		}
	}
	return problems
}

/** Every rule the type system can't express. Exported for tests and the CLI. */
export function taskProblems(task: Task): Problem[] {
	const problems: Problem[] = []
	const add = (message: string, ...path: (string | number)[]) => problems.push({ message, path })

	const seen = new Set<string>()
	task.items.forEach((item, index) => {
		if (seen.has(item.id)) add(`Duplicate item id "${item.id}"`, 'items', index, 'id')
		seen.add(item.id)
		for (const message of itemProblems(task, item)) add(message, 'items', index)
	})

	const { jev, llm } = task
	const llmQuestion = llm && isQuestion(llm) ? llm : null

	if (task.kind === TASK_KINDS.generate) {
		if (!('raw' in jev)) add('A generate task sends raw Jev questions', 'jev')
		if (!llm || llmQuestion) add('A generate task needs llm instructions', 'llm')
		return problems
	}
	if ('raw' in jev) add('Only a generate task may send raw questions', 'jev')
	if (llm && !llmQuestion)
		add('llm instructions without a question are only for generate tasks', 'llm')
	if (llmQuestion && llmQuestion.type !== task.kind) {
		add('The llm question type must match the task kind', 'llm', 'type')
	}

	if (task.combine) {
		if (!SINGLE_KINDS.has(task.kind)) add('combine needs a choice, noul or score task', 'combine')
		if (!llmQuestion) add('A task with combine needs an llm question', 'llm')
	} else if (SINGLE_KINDS.has(task.kind)) {
		const questions = 'questions' in jev ? jev.questions : null
		const only = questions?.[ANSWER_KEY]
		if (!questions || Object.keys(questions).length !== 1 || only?.type !== task.kind) {
			add(`Jev needs exactly one ${task.kind} question named "${ANSWER_KEY}"`, 'jev')
		}
	}
	if (task.kind === TASK_KINDS.fanOut && !('questions' in jev)) {
		add('A fan_out task needs Jev questions', 'jev')
	}
	if (task.kind === TASK_KINDS.findLines && !('perLine' in jev)) {
		add('A find_lines task needs a perLine question', 'jev')
	}
	return problems
}

export const taskSchema = taskObjectSchema.superRefine((task, ctx) => {
	for (const problem of taskProblems(task)) {
		ctx.addIssue({ code: 'custom', message: problem.message, path: problem.path })
	}
})
```

- [ ] **Step 6: Write the prices file and loader**

`content/prices.json`:

```json
{
	"checkedOn": "2026-10-01",
	"models": {
		"jev-1.13.0": {
			"inputPerM": 0.042,
			"outputPerM": 0,
			"source": "https://docs.typesafe.ai/models"
		},
		"claude-opus-5-5": {
			"inputPerM": 4,
			"outputPerM": 20,
			"source": "https://platform.claude.com/docs/en/about-claude/pricing"
		},
		"claude-sonnet-5-5": {
			"inputPerM": 2,
			"outputPerM": 10,
			"source": "https://platform.claude.com/docs/en/about-claude/pricing"
		},
		"claude-haiku-4-5-20251001": {
			"inputPerM": 1,
			"outputPerM": 5,
			"source": "https://platform.claude.com/docs/en/about-claude/pricing"
		}
	}
}
```

`src/content/prices.ts`:

```ts
import { z } from 'zod'
import raw from '../../content/prices.json'

// Dollars per million tokens, with the page the price was read from (DESIGN 4.1).
export const priceEntrySchema = z.object({
	inputPerM: z.number().nonnegative(),
	outputPerM: z.number().nonnegative(),
	source: z.url()
})
export type PriceEntry = z.infer<typeof priceEntrySchema>

export const priceTableSchema = z.object({
	checkedOn: z.iso.date(),
	models: z.record(z.string().min(1), priceEntrySchema)
})
export type PriceTable = z.infer<typeof priceTableSchema>

// Parsed at import, so a malformed file fails the build at prerender.
export const PRICES: PriceTable = priceTableSchema.parse(raw)
```

- [ ] **Step 7: Run the tests to verify they pass**

Run: `corepack pnpm exec vitest run src/content/task-schema.test.ts src/content/prices.test.ts`
Expected: PASS. Then `corepack pnpm typecheck` and `corepack pnpm lint`: both clean.

- [ ] **Step 8: Commit**

```bash
git add src/lib/constants.ts src/content/task-schema.ts src/content/task-schema.test.ts src/content/prices.ts src/content/prices.test.ts content/prices.json src/runner/testing/tasks.ts
git commit -m "feat(runner): add the task schema, runner constants and prices"
```

---

### Task 2: Runner types and the TypeSafe and Anthropic providers

**Files:**

- Create: `src/runner/types.ts`
- Create: `src/runner/providers/provider-error.ts`
- Create: `src/runner/providers/typesafe.ts`
- Create: `src/runner/providers/anthropic.ts`
- Test: `src/runner/providers/typesafe.test.ts`, `src/runner/providers/anthropic.test.ts`

**Interfaces:**

- Consumes: `Structured`, `Question`, `RawQuestion`, `TaskItem` (Task 1); `PROVIDER_ERROR_KINDS`, `RACERS`, `RUN_EVENTS`, `Racer`.
- Produces (types): `usageSchema`/`Usage`, `itemResultSchema`/`ItemResult` (`{ itemId, ok, raw, parsed, credit, correct, latencyMs, usage, costUsd, error? }`), `runTotalsSchema`/`RunTotals`, `RunEvent`, `ProviderResult` (`{ text, latencyMs, usage, modelId }`), `JevRequestBody`, `LlmAnswer`, `ItemRunner`.
- Produces (providers): `ProviderError` (`kind`, `status`, `body`, `latencyMs`), `errorKindForStatus(status)`, `timedFetch(url, init, signal?)`, `parseProviderJson(text, schema, latencyMs)`, `TYPESAFE_URL`, `callTypeSafe(body, key, signal?)`, `ANTHROPIC_URL`, `ANTHROPIC_VERSION`, `AnthropicBody`, `buildAnthropicBody(modelId, prompt)`, `callAnthropic(body, key, signal?)`.

- [ ] **Step 1: Write the runner types**

`src/runner/types.ts`:

```ts
import { z } from 'zod'
import type { Question, RawQuestion, Structured, TaskItem } from '@/content/task-schema'
import { PROVIDER_ERROR_KINDS, RUN_EVENTS, type Racer } from '@/lib/constants'

export const usageSchema = z.object({
	inputTokens: z.number().int().nonnegative(),
	outputTokens: z.number().int().nonnegative()
})
export type Usage = z.infer<typeof usageSchema>

// One item's result for one racer (DESIGN 3.1). Recordings store these as-is.
export const itemResultSchema = z.object({
	itemId: z.string().min(1),
	// The call succeeded and the output parsed.
	ok: z.boolean(),
	// Jev's response body or the LLM's text, shown when parsing fails (R44).
	raw: z.string(),
	parsed: z.unknown(),
	// 1 or 0, or the share right for fan_out; null means "not scored".
	credit: z.number().min(0).max(1).nullable(),
	// credit === 1; null means "not scored".
	correct: z.boolean().nullable(),
	latencyMs: z.number().nonnegative(),
	usage: usageSchema,
	// null means "price unknown". Never estimated.
	costUsd: z.number().nonnegative().nullable(),
	error: z.enum(PROVIDER_ERROR_KINDS).optional()
})
export type ItemResult = z.infer<typeof itemResultSchema>

export const runTotalsSchema = z.object({
	items: z.number().int().nonnegative(),
	// Items with a stored answer.
	scored: z.number().int().nonnegative(),
	// Items with full credit.
	correct: z.number().int().nonnegative(),
	// Total credit / scored; null when nothing is scored.
	accuracy: z.number().min(0).max(1).nullable(),
	// First start to last finish.
	wallMs: z.number().nonnegative(),
	costUsd: z.number().nonnegative().nullable(),
	inputTokens: z.number().int().nonnegative(),
	outputTokens: z.number().int().nonnegative(),
	parseFailures: z.number().int().nonnegative()
})
export type RunTotals = z.infer<typeof runTotalsSchema>

export type RunEvent =
	| {
			type: typeof RUN_EVENTS.itemStarted
			racer: Racer
			itemId: string
			lane: number
			atMs: number
	  }
	| {
			type: typeof RUN_EVENTS.itemFinished
			racer: Racer
			lane: number
			atMs: number
			result: ItemResult
	  }
	| { type: typeof RUN_EVENTS.runFinished; racer: Racer; atMs: number; totals: RunTotals }

/** What every provider call returns: the text to parse, timed once, with real token counts. */
export type ProviderResult = { text: string; latencyMs: number; usage: Usage; modelId: string }

export type JevRequestBody = {
	model: string
	state: Structured
	questions: Record<string, Question | RawQuestion>
}

// An answer in the LLM's JSON format, also what Code functions return:
// choice -> option key, noul -> boolean, score -> level, fan_out -> one
// boolean per question, find_lines -> line numbers, generate -> text.
export type LlmAnswer = string | boolean | number | Record<string, boolean> | number[]

export type ItemRunner = (item: TaskItem, signal: AbortSignal) => Promise<ItemResult>
```

- [ ] **Step 2: Write the failing provider tests**

`src/runner/providers/typesafe.test.ts`:

```ts
import { afterEach, describe, expect, it, vi } from 'vitest'
import { PROVIDER_ERROR_KINDS } from '@/lib/constants'
import { ProviderError } from './provider-error'
import { callTypeSafe, TYPESAFE_URL } from './typesafe'

const KEY = 'ts-test-key-123'
const BODY = {
	model: 'jev-latest',
	state: 'Help! My payouts have been failing for 3 days.',
	questions: { answer: { type: 'noul' as const, instructions: 'Does this convey urgency?' } }
}
const OK_BODY = JSON.stringify({
	model: 'jev-1.13.0',
	answers: { answer: { type: 'noul', noul: 0.95 } },
	usage: { input_tokens: 296, output_tokens: 20 }
})

function mockFetch(response: Response | Error) {
	const fetchMock = vi.fn<typeof fetch>(async () => {
		if (response instanceof Error) throw response
		return response
	})
	vi.stubGlobal('fetch', fetchMock)
	return fetchMock
}

async function failure(promise: Promise<unknown>): Promise<ProviderError> {
	try {
		await promise
	} catch (error) {
		if (error instanceof ProviderError) return error
		throw error
	}
	throw new Error('Expected a ProviderError')
}

afterEach(() => vi.unstubAllGlobals())

describe('callTypeSafe', () => {
	it('posts the body with the key in the Authorization header only', async () => {
		const fetchMock = mockFetch(new Response(OK_BODY, { status: 200 }))
		await callTypeSafe(BODY, KEY)
		const [url, init] = fetchMock.mock.calls[0] ?? []
		expect(String(url)).toBe(TYPESAFE_URL)
		expect(String(url)).not.toContain(KEY)
		expect(init?.method).toBe('POST')
		expect(new Headers(init?.headers).get('authorization')).toBe(`Bearer ${KEY}`)
		expect(JSON.parse(String(init?.body))).toEqual(BODY)
	})

	it('returns the body text, versioned model, token usage and latency', async () => {
		mockFetch(new Response(OK_BODY, { status: 200 }))
		const result = await callTypeSafe(BODY, KEY)
		expect(result.text).toBe(OK_BODY)
		expect(result.modelId).toBe('jev-1.13.0')
		expect(result.usage).toEqual({ inputTokens: 296, outputTokens: 20 })
		expect(result.latencyMs).toBeGreaterThanOrEqual(0)
	})

	it.each([
		[400, PROVIDER_ERROR_KINDS.malformed],
		[401, PROVIDER_ERROR_KINDS.invalidKey],
		[403, PROVIDER_ERROR_KINDS.forbidden],
		[422, PROVIDER_ERROR_KINDS.malformed],
		[429, PROVIDER_ERROR_KINDS.rateLimited],
		[500, PROVIDER_ERROR_KINDS.unknown],
		[503, PROVIDER_ERROR_KINDS.overloaded],
		[529, PROVIDER_ERROR_KINDS.overloaded]
	])('maps status %i to %s', async (status, kind) => {
		mockFetch(new Response('{"detail":"x"}', { status }))
		const error = await failure(callTypeSafe(BODY, KEY))
		expect(error.kind).toBe(kind)
		expect(error.status).toBe(status)
		expect(error.message).not.toContain(KEY)
	})

	it('keeps a 422 body to show, but drops the body of an auth failure', async () => {
		mockFetch(new Response('{"detail":"questions.answer.type"}', { status: 422 }))
		expect((await failure(callTypeSafe(BODY, KEY))).body).toContain('questions.answer.type')
		mockFetch(new Response('{"detail":"bad key"}', { status: 401 }))
		expect((await failure(callTypeSafe(BODY, KEY))).body).toBe('')
	})

	it('maps a failed request to network', async () => {
		mockFetch(new TypeError('Failed to fetch'))
		expect((await failure(callTypeSafe(BODY, KEY))).kind).toBe(PROVIDER_ERROR_KINDS.network)
	})

	it('rethrows an abort instead of turning it into a provider error', async () => {
		const controller = new AbortController()
		controller.abort()
		mockFetch(new DOMException('Aborted', 'AbortError'))
		await expect(callTypeSafe(BODY, KEY, controller.signal)).rejects.toThrow('Aborted')
	})

	it('maps a 200 body that is not a TypeSafe response to unknown', async () => {
		mockFetch(new Response('<html>', { status: 200 }))
		expect((await failure(callTypeSafe(BODY, KEY))).kind).toBe(PROVIDER_ERROR_KINDS.unknown)
	})

	it('calls fetch exactly once, with no retry', async () => {
		const fetchMock = mockFetch(new Response('{}', { status: 529 }))
		await failure(callTypeSafe(BODY, KEY))
		expect(fetchMock).toHaveBeenCalledTimes(1)
	})
})
```

`src/runner/providers/anthropic.test.ts`:

```ts
import { afterEach, describe, expect, it, vi } from 'vitest'
import { CLAUDE_MODELS, PROVIDER_ERROR_KINDS } from '@/lib/constants'
import { ProviderError } from './provider-error'
import { ANTHROPIC_URL, ANTHROPIC_VERSION, buildAnthropicBody, callAnthropic } from './anthropic'

const KEY = 'sk-ant-test-456'
const OK_BODY = JSON.stringify({
	model: 'claude-opus-5-5',
	content: [
		{ type: 'thinking', thinking: '' },
		{ type: 'text', text: '{"answer": ' },
		{ type: 'text', text: '"billing"}' }
	],
	usage: { input_tokens: 812, output_tokens: 240 },
	stop_reason: 'end_turn'
})

afterEach(() => vi.unstubAllGlobals())

describe('buildAnthropicBody', () => {
	it('sends one user message and runs Opus 5.5 at low effort', () => {
		const body = buildAnthropicBody(CLAUDE_MODELS.opus, 'prompt')
		expect(body.model).toBe(CLAUDE_MODELS.opus)
		expect(body.messages).toEqual([{ role: 'user', content: 'prompt' }])
		expect(body.output_config).toEqual({ effort: 'low' })
	})

	it('leaves Sonnet and Haiku at the provider defaults', () => {
		expect(buildAnthropicBody(CLAUDE_MODELS.sonnet, 'p').output_config).toBeUndefined()
		expect(buildAnthropicBody(CLAUDE_MODELS.haiku, 'p').output_config).toBeUndefined()
	})
})

describe('callAnthropic', () => {
	it('sends the key and version headers plus direct browser access', async () => {
		const fetchMock = vi.fn<typeof fetch>(async () => new Response(OK_BODY, { status: 200 }))
		vi.stubGlobal('fetch', fetchMock)
		await callAnthropic(buildAnthropicBody(CLAUDE_MODELS.opus, 'p'), KEY)
		const [url, init] = fetchMock.mock.calls[0] ?? []
		const headers = new Headers(init?.headers)
		expect(String(url)).toBe(ANTHROPIC_URL)
		expect(String(url)).not.toContain(KEY)
		expect(headers.get('x-api-key')).toBe(KEY)
		expect(headers.get('anthropic-version')).toBe(ANTHROPIC_VERSION)
		expect(headers.get('anthropic-dangerous-direct-browser-access')).toBe('true')
	})

	it('returns the joined text blocks, skipping thinking, with usage and model', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn(async () => new Response(OK_BODY, { status: 200 }))
		)
		const result = await callAnthropic(buildAnthropicBody(CLAUDE_MODELS.opus, 'p'), KEY)
		expect(result.text).toBe('{"answer": "billing"}')
		expect(result.usage).toEqual({ inputTokens: 812, outputTokens: 240 })
		expect(result.modelId).toBe('claude-opus-5-5')
	})

	it('maps an error status to a ProviderError without the key', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn(async () => new Response('{"type":"error"}', { status: 529 }))
		)
		const error = await callAnthropic(buildAnthropicBody(CLAUDE_MODELS.opus, 'p'), KEY).catch(
			(caught: unknown) => caught
		)
		expect(error).toBeInstanceOf(ProviderError)
		expect(error instanceof ProviderError && error.kind).toBe(PROVIDER_ERROR_KINDS.overloaded)
		expect(String(error)).not.toContain(KEY)
	})
})
```

- [ ] **Step 3: Run them to verify they fail**

Run: `corepack pnpm exec vitest run src/runner/providers`
Expected: FAIL (modules not found).

- [ ] **Step 4: Write the shared provider error and timed fetch**

`src/runner/providers/provider-error.ts`:

```ts
import type { z } from 'zod'
import { PROVIDER_ERROR_KINDS, type ProviderErrorKind } from '@/lib/constants'

// Enough of an error body to show what went wrong (level 2 shows a 422 body).
const MAX_ERROR_BODY_CHARS = 2000

const KIND_BY_STATUS: Record<number, ProviderErrorKind> = {
	400: PROVIDER_ERROR_KINDS.malformed,
	401: PROVIDER_ERROR_KINDS.invalidKey,
	403: PROVIDER_ERROR_KINDS.forbidden,
	422: PROVIDER_ERROR_KINDS.malformed,
	429: PROVIDER_ERROR_KINDS.rateLimited,
	503: PROVIDER_ERROR_KINDS.overloaded,
	529: PROVIDER_ERROR_KINDS.overloaded
}

export function errorKindForStatus(status: number): ProviderErrorKind {
	return KIND_BY_STATUS[status] ?? PROVIDER_ERROR_KINDS.unknown
}

/** A failed provider call. It carries the kind and status, never the key or the request. */
export class ProviderError extends Error {
	readonly kind: ProviderErrorKind
	readonly status: number | null
	readonly body: string
	readonly latencyMs: number

	constructor(kind: ProviderErrorKind, status: number | null, body: string, latencyMs: number) {
		super(`Provider call failed: ${kind}`)
		this.name = 'ProviderError'
		this.kind = kind
		this.status = status
		this.body = body
		this.latencyMs = latencyMs
	}
}

function isAbort(error: unknown, signal: AbortSignal | undefined): boolean {
	return signal?.aborted === true || (error instanceof DOMException && error.name === 'AbortError')
}

export type TimedResponse = { text: string; latencyMs: number }

/** One request, timed from send to the last body byte, never retried (R7). */
export async function timedFetch(
	url: string,
	init: RequestInit,
	signal?: AbortSignal
): Promise<TimedResponse> {
	const start = performance.now()
	let response: Response
	let text: string
	try {
		response = await fetch(url, { ...init, signal })
		text = await response.text()
	} catch (error) {
		if (isAbort(error, signal)) throw error
		throw new ProviderError(PROVIDER_ERROR_KINDS.network, null, '', performance.now() - start)
	}
	const latencyMs = performance.now() - start
	if (!response.ok) {
		const kind = errorKindForStatus(response.status)
		// An auth failure keeps no body, so nothing about the key is stored or shown.
		const authFailure =
			kind === PROVIDER_ERROR_KINDS.invalidKey || kind === PROVIDER_ERROR_KINDS.forbidden
		const body = authFailure ? '' : text.slice(0, MAX_ERROR_BODY_CHARS)
		throw new ProviderError(kind, response.status, body, latencyMs)
	}
	return { text, latencyMs }
}

/** Parses a 2xx body; a body that doesn't match the provider's shape is an unknown error. */
export function parseProviderJson<T>(text: string, schema: z.ZodType<T>, latencyMs: number): T {
	let json: unknown
	try {
		json = JSON.parse(text)
	} catch {
		json = undefined
	}
	const result = schema.safeParse(json)
	if (!result.success) {
		throw new ProviderError(
			PROVIDER_ERROR_KINDS.unknown,
			null,
			text.slice(0, MAX_ERROR_BODY_CHARS),
			latencyMs
		)
	}
	return result.data
}
```

- [ ] **Step 5: Write the TypeSafe provider**

`src/runner/providers/typesafe.ts`:

```ts
import { z } from 'zod'
import type { JevRequestBody, ProviderResult } from '@/runner/types'
import { parseProviderJson, timedFetch } from './provider-error'

export const TYPESAFE_URL = 'https://api.typesafe.ai/v1/systemone'

// The parts of the response the provider needs; parse.ts validates the answers.
const envelopeSchema = z.object({
	model: z.string().min(1),
	answers: z.record(z.string(), z.unknown()),
	usage: z.object({
		input_tokens: z.number().int().nonnegative(),
		output_tokens: z.number().int().nonnegative()
	})
})

/**
 * Calls Jev directly (the recording CLI). Browser calls go through /api/jev
 * instead, because TypeSafe blocks CORS (spec 2.3); that path is slice 8.
 */
export async function callTypeSafe(
	body: JevRequestBody,
	key: string,
	signal?: AbortSignal
): Promise<ProviderResult> {
	const { text, latencyMs } = await timedFetch(
		TYPESAFE_URL,
		{
			method: 'POST',
			headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
			body: JSON.stringify(body)
		},
		signal
	)
	const envelope = parseProviderJson(text, envelopeSchema, latencyMs)
	return {
		text,
		latencyMs,
		usage: { inputTokens: envelope.usage.input_tokens, outputTokens: envelope.usage.output_tokens },
		modelId: envelope.model
	}
}
```

- [ ] **Step 6: Write the Anthropic provider**

`src/runner/providers/anthropic.ts`:

```ts
import { z } from 'zod'
import { CLAUDE_MODELS } from '@/lib/constants'
import type { ProviderResult } from '@/runner/types'
import { parseProviderJson, timedFetch } from './provider-error'

export const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages'
export const ANTHROPIC_VERSION = '2023-06-01'

// Room for Opus 5.5's thinking at low effort plus the short JSON answer.
// Only tokens actually produced are billed.
const ANTHROPIC_MAX_TOKENS = 16000

// Opus 5.5 can't turn thinking off, so it runs at low effort (DESIGN 3.2).
// Every other model runs at its defaults. Methodology states both.
const OPUS_EFFORT = 'low'

const USER_ROLE = 'user'
const TEXT_BLOCK = 'text'

export type AnthropicBody = {
	model: string
	max_tokens: number
	messages: { role: typeof USER_ROLE; content: string }[]
	output_config?: { effort: typeof OPUS_EFFORT }
}

export function buildAnthropicBody(modelId: string, prompt: string): AnthropicBody {
	const body: AnthropicBody = {
		model: modelId,
		max_tokens: ANTHROPIC_MAX_TOKENS,
		messages: [{ role: USER_ROLE, content: prompt }]
	}
	if (modelId === CLAUDE_MODELS.opus) body.output_config = { effort: OPUS_EFFORT }
	return body
}

const messageSchema = z.object({
	model: z.string().min(1),
	content: z.array(z.looseObject({ type: z.string(), text: z.string().optional() })),
	usage: z.object({
		input_tokens: z.number().int().nonnegative(),
		output_tokens: z.number().int().nonnegative()
	})
})

/** Calls the Messages API. Works from the browser and the CLI alike. */
export async function callAnthropic(
	body: AnthropicBody,
	key: string,
	signal?: AbortSignal
): Promise<ProviderResult> {
	const { text, latencyMs } = await timedFetch(
		ANTHROPIC_URL,
		{
			method: 'POST',
			headers: {
				'x-api-key': key,
				'anthropic-version': ANTHROPIC_VERSION,
				'content-type': 'application/json',
				'anthropic-dangerous-direct-browser-access': 'true'
			},
			body: JSON.stringify(body)
		},
		signal
	)
	const message = parseProviderJson(text, messageSchema, latencyMs)
	// Thinking blocks come back empty by default; only text blocks are the answer.
	const answerText = message.content
		.filter((block) => block.type === TEXT_BLOCK)
		.map((block) => block.text ?? '')
		.join('')
	return {
		text: answerText,
		latencyMs,
		usage: { inputTokens: message.usage.input_tokens, outputTokens: message.usage.output_tokens },
		modelId: message.model
	}
}
```

- [ ] **Step 7: Run the tests to verify they pass**

Run: `corepack pnpm exec vitest run src/runner/providers`
Expected: PASS. Then `corepack pnpm typecheck` and `corepack pnpm lint`: clean.

- [ ] **Step 8: Commit**

```bash
git add src/runner/types.ts src/runner/providers
git commit -m "feat(runner): add runner types and the typesafe and anthropic providers"
```

---

### Task 3: Jev request and LLM prompt builders

**Files:**

- Create: `src/runner/jev-request.ts`
- Create: `src/runner/llm-prompt.ts`
- Test: `src/runner/jev-request.test.ts`, `src/runner/llm-prompt.test.ts`

**Interfaces:**

- Consumes: `Task`, `TaskItem`, `Question`, `RawQuestion`, `Structured`, `isQuestion`, `linesOf`, `answerQuestion` (Task 1); `JevRequestBody` (Task 2).
- Produces: `lineKey(lineNumber): string`, `lineNumberFromKey(key): number | null`, `jevQuestions(task, item)`, `buildJevRequest(task, item): JevRequestBody`, `buildLlmPrompt(task, item): string`.

- [ ] **Step 1: Write the failing tests**

`src/runner/jev-request.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { buildJevRequest, lineKey, lineNumberFromKey } from './jev-request'
import { choiceTask, fanOutTask, findLinesTask, generateTask, item } from './testing/tasks'

describe('buildJevRequest', () => {
	it("sends jev-latest, the item's state and the task's questions", () => {
		const body = buildJevRequest(choiceTask, item(choiceTask, 't1'))
		expect(body.model).toBe('jev-latest')
		expect(body.state).toBe('My invoice is wrong.')
		expect(Object.keys(body.questions)).toEqual(['answer'])
	})

	it("uses an item's own questions when it sets them", () => {
		expect(Object.keys(buildJevRequest(fanOutTask, item(fanOutTask, 'f1')).questions)).toEqual([
			'urgent',
			'refund'
		])
		expect(Object.keys(buildJevRequest(fanOutTask, item(fanOutTask, 'f2')).questions)).toEqual([
			'a',
			'b'
		])
	})

	it('asks one Noul per line for find_lines, with the line in the instructions', () => {
		const body = buildJevRequest(findLinesTask, item(findLinesTask, 'd1'))
		expect(Object.keys(body.questions)).toEqual(['line_1', 'line_2', 'line_3', 'line_4'])
		expect(body.questions.line_2).toEqual({
			type: 'noul',
			instructions: { line: 'Due by Friday', question: 'Does `line` mention a deadline?' }
		})
	})

	it('sends raw questions unchanged for generate', () => {
		expect(buildJevRequest(generateTask, item(generateTask, 'g1')).questions).toEqual({
			poem: { type: 'text', instructions: 'Write a 4-line poem about the state.' }
		})
	})
})

describe('line keys', () => {
	it('round-trips a line number', () => {
		expect(lineNumberFromKey(lineKey(12))).toBe(12)
		expect(lineNumberFromKey('answer')).toBeNull()
	})
})
```

`src/runner/llm-prompt.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { buildLlmPrompt } from './llm-prompt'
import {
	choiceTask,
	countTask,
	fanOutTask,
	findLinesTask,
	generateTask,
	item,
	noulTask,
	scoreTask
} from './testing/tasks'

describe('buildLlmPrompt', () => {
	it("gives the LLM Jev's state, instructions and options, and a fixed JSON format", () => {
		const prompt = buildLlmPrompt(choiceTask, item(choiceTask, 't1'))
		expect(prompt).toContain('My invoice is wrong.')
		expect(prompt).toContain('Which team should handle this ticket?')
		expect(prompt).toContain('- billing: Payments, invoices, refunds')
		expect(prompt).toContain('- sales')
		expect(prompt).toContain('{"answer": "<one of: billing, technical, sales>"}')
	})

	it('states the noul criteria and a boolean format', () => {
		const prompt = buildLlmPrompt(noulTask, item(noulTask, 'n1'))
		expect(prompt).toContain('true means: Upset or angry')
		expect(prompt).toContain('false means: Calm')
		expect(prompt).toContain('{"answer": <true or false>}')
	})

	it('numbers the score levels from 0', () => {
		const prompt = buildLlmPrompt(scoreTask, item(scoreTask, 's1'))
		expect(prompt).toContain('0: Calm')
		expect(prompt).toContain('2: Angry')
		expect(prompt).toContain('{"answer": <a level number from 0 to 2>}')
	})

	it('lists every fan_out question, using per-item questions', () => {
		const prompt = buildLlmPrompt(fanOutTask, item(fanOutTask, 'f2'))
		expect(prompt).toContain('- a: Is the first entry a fruit?')
		expect(prompt).toContain('{"answer": {"a": <true or false>, "b": <true or false>}}')
	})

	it('numbers the lines for find_lines', () => {
		const prompt = buildLlmPrompt(findLinesTask, item(findLinesTask, 'd1'))
		expect(prompt).toContain('2: Due by Friday')
		expect(prompt).toContain('Does `line` mention a deadline?')
		expect(prompt).toContain('{"answer": [<line numbers>]}')
	})

	it("uses the llm question on a combine task, not Jev's smaller questions", () => {
		const prompt = buildLlmPrompt(countTask, item(countTask, 'c1'))
		expect(prompt).toContain('How many fruits are in the list?')
		expect(prompt).not.toContain('Is "apple" a fruit?')
	})

	it('asks for text on a generate task', () => {
		const prompt = buildLlmPrompt(generateTask, item(generateTask, 'g1'))
		expect(prompt).toContain('Write a 4-line poem about the state.')
		expect(prompt).toContain('{"answer": "<your text>"}')
	})

	it('pretty-prints a structured state as JSON', () => {
		const task = { ...choiceTask, items: [{ id: 'j', state: { subject: 'Refund' } }] }
		expect(buildLlmPrompt(task, { id: 'j', state: { subject: 'Refund' } })).toContain(
			'"subject": "Refund"'
		)
	})
})
```

- [ ] **Step 2: Run them to verify they fail**

Run: `corepack pnpm exec vitest run src/runner/jev-request.test.ts src/runner/llm-prompt.test.ts`
Expected: FAIL (modules not found).

- [ ] **Step 3: Write the Jev request builder**

`src/runner/jev-request.ts`:

```ts
import {
	linesOf,
	type Question,
	type RawQuestion,
	type Task,
	type TaskItem
} from '@/content/task-schema'
import { JEV_MODEL_ALIAS, QUESTION_KINDS } from '@/lib/constants'
import type { JevRequestBody } from './types'

const LINE_KEY_PREFIX = 'line_'

export function lineKey(lineNumber: number): string {
	return `${LINE_KEY_PREFIX}${lineNumber}`
}

export function lineNumberFromKey(key: string): number | null {
	if (!key.startsWith(LINE_KEY_PREFIX)) return null
	const lineNumber = Number(key.slice(LINE_KEY_PREFIX.length))
	return Number.isInteger(lineNumber) && lineNumber > 0 ? lineNumber : null
}

/** The questions Jev gets for this item: raw, one Noul per line, the item's own, or the task's. */
export function jevQuestions(task: Task, item: TaskItem): Record<string, Question | RawQuestion> {
	const { jev } = task
	if ('raw' in jev) return jev.raw
	if ('perLine' in jev) {
		const lines = linesOf(item.state)
		if (!lines) throw new Error(`Item ${item.id} of ${task.id} has no lines`)
		const { instructions, criteria } = jev.perLine
		return Object.fromEntries(
			lines.map((line, index): [string, Question] => [
				lineKey(index + 1),
				{
					type: QUESTION_KINDS.noul,
					instructions: { line, question: instructions },
					...(criteria ? { criteria } : {})
				}
			])
		)
	}
	return item.questions ?? jev.questions
}

/** The exact TypeSafe body for one item (DESIGN 3.2). */
export function buildJevRequest(task: Task, item: TaskItem): JevRequestBody {
	return { model: JEV_MODEL_ALIAS, state: item.state, questions: jevQuestions(task, item) }
}
```

- [ ] **Step 4: Write the LLM prompt builder**

`src/runner/llm-prompt.ts`:

```ts
import {
	answerQuestion,
	isQuestion,
	linesOf,
	type Question,
	type Structured,
	type Task,
	type TaskItem
} from '@/content/task-schema'
import { ANSWER_KEY, QUESTION_KINDS, TASK_KINDS } from '@/lib/constants'
import { jevQuestions } from './jev-request'

// One prompt per item: the same state, the same instructions and the same
// option or level set Jev gets, plus a fixed JSON answer format (R92).

const INTRO = 'Answer the question about the state below.'
const FORMAT_LEAD = 'Reply with only this JSON object and nothing else:'

function text(value: Structured): string {
	return typeof value === 'string' ? value : JSON.stringify(value, null, 2)
}

function stateSection(task: Task, item: TaskItem): string {
	const lines = task.kind === TASK_KINDS.findLines ? linesOf(item.state) : null
	const body = lines
		? lines.map((line, index) => `${index + 1}: ${line}`).join('\n')
		: text(item.state)
	return `State:\n${body}`
}

function format(answer: string): string {
	return `${FORMAT_LEAD}\n{"${ANSWER_KEY}": ${answer}}`
}

function questionSections(question: Question): string[] {
	const sections = [`Question:\n${text(question.instructions)}`]
	switch (question.type) {
		case QUESTION_KINDS.choice: {
			const options = Object.entries(question.criteria).map(([key, description]) =>
				description === null ? `- ${key}` : `- ${key}: ${text(description)}`
			)
			sections.push(`Options (answer with exactly one option key):\n${options.join('\n')}`)
			sections.push(format(`"<one of: ${Object.keys(question.criteria).join(', ')}>"`))
			break
		}
		case QUESTION_KINDS.noul: {
			const lines = ['Answer true or false.']
			if (question.criteria?.true !== undefined)
				lines.push(`true means: ${text(question.criteria.true)}`)
			if (question.criteria?.false !== undefined)
				lines.push(`false means: ${text(question.criteria.false)}`)
			sections.push(lines.join('\n'))
			sections.push(format('<true or false>'))
			break
		}
		case QUESTION_KINDS.score: {
			const levels = question.criteria.map((description, index) => `${index}: ${text(description)}`)
			sections.push(`Levels (answer with the level number):\n${levels.join('\n')}`)
			sections.push(format(`<a level number from 0 to ${question.criteria.length - 1}>`))
			break
		}
	}
	return sections
}

function bodySections(task: Task, item: TaskItem): string[] {
	switch (task.kind) {
		case TASK_KINDS.fanOut: {
			const questions = Object.entries(jevQuestions(task, item))
			const list = questions.map(([key, question]) => `- ${key}: ${text(question.instructions)}`)
			const fields = questions.map(([key]) => `"${key}": <true or false>`).join(', ')
			return [`Answer each question with true or false:\n${list.join('\n')}`, format(`{${fields}}`)]
		}
		case TASK_KINDS.findLines: {
			if (!('perLine' in task.jev)) throw new Error(`${task.id} has no perLine question`)
			return [
				`Question:\n${text(task.jev.perLine.instructions)}`,
				'The lines are numbered from 1. List the number of every line where the answer is yes.',
				format('[<line numbers>]')
			]
		}
		case TASK_KINDS.generate: {
			if (!task.llm || isQuestion(task.llm)) throw new Error(`${task.id} has no llm instructions`)
			return [`Instructions:\n${text(task.llm.instructions)}`, format('"<your text>"')]
		}
		default: {
			const question = answerQuestion(task)
			if (!question) throw new Error(`${task.id} has no answer question`)
			return questionSections(question)
		}
	}
}

export function buildLlmPrompt(task: Task, item: TaskItem): string {
	return [INTRO, stateSection(task, item), ...bodySections(task, item)].join('\n\n')
}
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `corepack pnpm exec vitest run src/runner/jev-request.test.ts src/runner/llm-prompt.test.ts`
Expected: PASS. Then `corepack pnpm typecheck` and `corepack pnpm lint`: clean.

- [ ] **Step 6: Commit**

```bash
git add src/runner/jev-request.ts src/runner/jev-request.test.ts src/runner/llm-prompt.ts src/runner/llm-prompt.test.ts
git commit -m "feat(runner): build jev requests and llm prompts from one task"
```

---

### Task 4: Parse

**Files:**

- Create: `src/runner/parse.ts`
- Test: `src/runner/parse.test.ts`

**Interfaces:**

- Consumes: `jevQuestions` (Task 3); `Task`, `TaskItem`; `LlmAnswer` (Task 2).
- Produces: `jevAnswerSchema`/`JevAnswer`, `JevAnswers` (`Record<string, JevAnswer>`), `ParseOutcome<T>` (`{ ok: true; parsed: T } | { ok: false; parsed: null }`), `parseJevAnswers(task, item, bodyText): ParseOutcome<JevAnswers>`, `stripFences(text): string`, `parseLlmAnswer(kind, text): ParseOutcome<LlmAnswer>`.

- [ ] **Step 1: Write the failing tests**

`src/runner/parse.test.ts`:

````ts
import { describe, expect, it } from 'vitest'
import { parseJevAnswers, parseLlmAnswer, stripFences } from './parse'
import { choiceTask, fanOutTask, item } from './testing/tasks'

function jevBody(answers: Record<string, unknown>): string {
	return JSON.stringify({
		model: 'jev-1.13.0',
		answers,
		usage: { input_tokens: 1, output_tokens: 1 }
	})
}
const CHOICE_ANSWER = {
	type: 'choice',
	choice: 'billing',
	probabilities: { billing: 0.88, technical: 0.12, sales: 0 },
	confidence: 0.81
}

describe('parseJevAnswers', () => {
	it('returns the answers map when every question has a matching answer', () => {
		const outcome = parseJevAnswers(
			choiceTask,
			item(choiceTask, 't1'),
			jevBody({ answer: CHOICE_ANSWER })
		)
		expect(outcome.ok).toBe(true)
		expect(outcome.parsed?.answer).toEqual(CHOICE_ANSWER)
	})

	it('fails when an answer is missing or has the wrong type', () => {
		const f1 = item(fanOutTask, 'f1')
		expect(
			parseJevAnswers(fanOutTask, f1, jevBody({ urgent: { type: 'noul', noul: 0.9 } })).ok
		).toBe(false)
		expect(
			parseJevAnswers(
				choiceTask,
				item(choiceTask, 't1'),
				jevBody({ answer: { type: 'noul', noul: 1 } })
			).ok
		).toBe(false)
	})

	it('fails on a body that is not JSON', () => {
		expect(parseJevAnswers(choiceTask, item(choiceTask, 't1'), 'oops')).toEqual({
			ok: false,
			parsed: null
		})
	})
})

describe('stripFences', () => {
	it('removes a json code fence and surrounding space', () => {
		expect(stripFences('```json\n{"answer": true}\n```')).toBe('{"answer": true}')
		expect(stripFences('  {"answer": true} ')).toBe('{"answer": true}')
	})
})

describe('parseLlmAnswer', () => {
	it.each([
		['choice', '{"answer": "billing"}', 'billing'],
		['noul', '{"answer": false}', false],
		['score', '```json\n{"answer": 2}\n```', 2],
		['fan_out', '{"answer": {"a": true, "b": false}}', { a: true, b: false }],
		['find_lines', '{"answer": [2, 4]}', [2, 4]],
		['generate', '{"answer": "Waves fold..."}', 'Waves fold...']
	] as const)('parses a %s answer', (kind, text, expected) => {
		expect(parseLlmAnswer(kind, text)).toEqual({ ok: true, parsed: expected })
	})

	it.each([
		['choice', 'billing'],
		['noul', '{"answer": "yes"}'],
		['score', '{"answer": 1.5}'],
		['find_lines', '{"answer": [0]}'],
		['generate', '{"answer": "   "}'],
		['choice', 'Sure! {"answer": "billing"}']
	] as const)('fails a %s reply of %j', (kind, text) => {
		expect(parseLlmAnswer(kind, text)).toEqual({ ok: false, parsed: null })
	})
})
````

- [ ] **Step 2: Run them to verify they fail**

Run: `corepack pnpm exec vitest run src/runner/parse.test.ts`
Expected: FAIL (module not found).

- [ ] **Step 3: Write parse**

`src/runner/parse.ts`:

````ts
import { z } from 'zod'
import type { Task, TaskItem } from '@/content/task-schema'
import { ANSWER_KEY, QUESTION_KINDS, TASK_KINDS, type TaskKind } from '@/lib/constants'
import { jevQuestions } from './jev-request'
import type { LlmAnswer } from './types'

// Answer shapes from docs.typesafe.ai/api, checked 2026-10-01.
const probabilitiesSchema = z.record(z.string(), z.number())

export const jevAnswerSchema = z.discriminatedUnion('type', [
	z.object({ type: z.literal(QUESTION_KINDS.noul), noul: z.number().min(0).max(1) }),
	z.object({
		type: z.literal(QUESTION_KINDS.choice),
		choice: z.string(),
		probabilities: probabilitiesSchema,
		confidence: z.number()
	}),
	z.object({
		type: z.literal(QUESTION_KINDS.score),
		score: z.number(),
		legend: z.record(z.string(), z.string()),
		probabilities: probabilitiesSchema,
		confidence: z.number()
	})
])
export type JevAnswer = z.infer<typeof jevAnswerSchema>
export type JevAnswers = Record<string, JevAnswer>

const jevBodySchema = z.object({ answers: z.record(z.string(), jevAnswerSchema) })

export type ParseOutcome<T> = { ok: true; parsed: T } | { ok: false; parsed: null }

const FAILED = { ok: false, parsed: null } as const

function json(text: string): { ok: true; value: unknown } | { ok: false } {
	try {
		return { ok: true, value: JSON.parse(text) }
	} catch {
		return { ok: false }
	}
}

/** Jev's answers, only when every question asked has an answer of the same type. */
export function parseJevAnswers(
	task: Task,
	item: TaskItem,
	bodyText: string
): ParseOutcome<JevAnswers> {
	const body = json(bodyText)
	if (!body.ok) return FAILED
	const result = jevBodySchema.safeParse(body.value)
	if (!result.success) return FAILED
	const { answers } = result.data
	for (const [key, question] of Object.entries(jevQuestions(task, item))) {
		if (answers[key]?.type !== question.type) return FAILED
	}
	return { ok: true, parsed: answers }
}

// A whole reply wrapped in one Markdown code fence, with an optional language.
const FENCE = /^```[a-zA-Z]*\s*\n?([\s\S]*?)\s*```$/

export function stripFences(text: string): string {
	const trimmed = text.trim()
	return (FENCE.exec(trimmed)?.[1] ?? trimmed).trim()
}

function answerOf<T extends LlmAnswer>(value: unknown, schema: z.ZodType<T>): T | null {
	const result = z.object({ [ANSWER_KEY]: schema }).safeParse(value)
	return result.success ? result.data[ANSWER_KEY] : null
}

function pickAnswer(kind: TaskKind, value: unknown): LlmAnswer | null {
	switch (kind) {
		case TASK_KINDS.choice:
			return answerOf(value, z.string().min(1))
		case TASK_KINDS.noul:
			return answerOf(value, z.boolean())
		case TASK_KINDS.score:
			return answerOf(value, z.number().int().nonnegative())
		case TASK_KINDS.fanOut:
			return answerOf(value, z.record(z.string(), z.boolean()))
		case TASK_KINDS.findLines:
			return answerOf(value, z.array(z.number().int().positive()))
		case TASK_KINDS.generate:
			return answerOf(value, z.string().trim().min(1))
	}
}

/** Fences stripped, then JSON.parse, then Zod; any failure is a miss shown with its raw text (R44). */
export function parseLlmAnswer(kind: TaskKind, text: string): ParseOutcome<LlmAnswer> {
	const body = json(stripFences(text))
	if (!body.ok) return FAILED
	const answer = pickAnswer(kind, body.value)
	return answer === null ? FAILED : { ok: true, parsed: answer }
}
````

Note for the implementer: `z.object({ [ANSWER_KEY]: schema })` with a `const` string key infers `{ answer: T }`. If TypeScript widens the computed key, write the key literally as `answer` with a comment that it equals `ANSWER_KEY`, and add `expect(ANSWER_KEY).toBe('answer')` to `parse.test.ts`.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `corepack pnpm exec vitest run src/runner/parse.test.ts`
Expected: PASS. Then `corepack pnpm typecheck` and `corepack pnpm lint`: clean.

- [ ] **Step 5: Commit**

```bash
git add src/runner/parse.ts src/runner/parse.test.ts
git commit -m "feat(runner): parse jev answers and llm json replies"
```

---

### Task 5: Score, cost and totals

**Files:**

- Create: `src/runner/score.ts`
- Create: `src/runner/cost.ts`
- Create: `src/runner/totals.ts`
- Test: `src/runner/score.test.ts`, `src/runner/cost.test.ts`, `src/runner/totals.test.ts`

**Interfaces:**

- Consumes: `JevAnswers` (Task 4); `lineNumberFromKey` (Task 3); `PriceEntry`, `PriceTable` (Task 1); `ItemResult`, `RunTotals`, `Usage`, `LlmAnswer` (Task 2); `NOUL_THRESHOLD`, `RACERS`, `Racer`.
- Produces: `SCORE_TOLERANCE = 0.5`, `FIND_LINES_F1_BAR = 0.8`, `f1(predicted, expected): number`, `isScorable(task, item, racer): boolean`, `scoreJev(task, item, answers): number | null`, `scoreAnswer(task, item, racer, answer): number | null`, `missCredit(task, item, racer): number | null`, `toCorrect(credit): boolean | null`; `costUsd(usage, price): number | null`, `priceFor(table, modelIds): PriceEntry | null`; `computeTotals(results, wallMs): RunTotals`.

- [ ] **Step 1: Write the failing tests**

`src/runner/score.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { RACERS } from '@/lib/constants'
import { f1, isScorable, missCredit, scoreAnswer, scoreJev, toCorrect } from './score'
import {
	choiceTask,
	compositeTask,
	fanOutTask,
	findLinesTask,
	generateTask,
	item,
	noulTask,
	scoreTask
} from './testing/tasks'

const choice = (picked: string) => ({
	answer: { type: 'choice' as const, choice: picked, probabilities: {}, confidence: 0.9 }
})
const noul = (value: number) => ({ type: 'noul' as const, noul: value })

describe('scoreJev', () => {
	it('choice: the choice equals the label', () => {
		expect(scoreJev(choiceTask, item(choiceTask, 't1'), choice('billing'))).toBe(1)
		expect(scoreJev(choiceTask, item(choiceTask, 't1'), choice('sales'))).toBe(0)
	})

	it('noul: at or above 0.5 means yes', () => {
		expect(scoreJev(noulTask, item(noulTask, 'n1'), { answer: noul(0.5) })).toBe(1)
		expect(scoreJev(noulTask, item(noulTask, 'n2'), { answer: noul(0.49) })).toBe(1)
		expect(scoreJev(noulTask, item(noulTask, 'n2'), { answer: noul(0.8) })).toBe(0)
	})

	it('score: within 0.5 of the label', () => {
		const answer = (score: number) => ({
			answer: { type: 'score' as const, score, legend: {}, probabilities: {}, confidence: 0.9 }
		})
		expect(scoreJev(scoreTask, item(scoreTask, 's1'), answer(1.5))).toBe(1)
		expect(scoreJev(scoreTask, item(scoreTask, 's1'), answer(1.49))).toBe(0)
	})

	it('fan_out: the share of questions right', () => {
		expect(
			scoreJev(fanOutTask, item(fanOutTask, 'f1'), { urgent: noul(0.9), refund: noul(0.1) })
		).toBe(0.5)
	})

	it('find_lines: F1 of the yes lines against the label, correct at 0.8', () => {
		const answers = { line_1: noul(0.1), line_2: noul(0.9), line_3: noul(0.2), line_4: noul(0.7) }
		expect(scoreJev(findLinesTask, item(findLinesTask, 'd1'), answers)).toBe(1)
		expect(
			scoreJev(findLinesTask, item(findLinesTask, 'd1'), { ...answers, line_1: noul(0.9) })
		).toBe(1)
		expect(
			scoreJev(findLinesTask, item(findLinesTask, 'd1'), { ...answers, line_4: noul(0.1) })
		).toBe(0)
	})

	it('is null for an unlabelled item, generate, and a combine task', () => {
		expect(scoreJev(choiceTask, item(choiceTask, 't3'), choice('sales'))).toBeNull()
		expect(scoreJev(generateTask, item(generateTask, 'g1'), {})).toBeNull()
		expect(scoreJev(compositeTask, item(compositeTask, 'r1'), {})).toBeNull()
	})
})

describe('scoreAnswer', () => {
	it('compares LLM answers exactly, fan_out by share, find_lines by F1', () => {
		expect(scoreAnswer(choiceTask, item(choiceTask, 't2'), RACERS.llm, 'technical')).toBe(1)
		expect(scoreAnswer(noulTask, item(noulTask, 'n1'), RACERS.llm, false)).toBe(0)
		expect(scoreAnswer(scoreTask, item(scoreTask, 's1'), RACERS.llm, 2)).toBe(1)
		expect(scoreAnswer(fanOutTask, item(fanOutTask, 'f2'), RACERS.llm, { a: true })).toBe(0.5)
		expect(scoreAnswer(findLinesTask, item(findLinesTask, 'd1'), RACERS.llm, [2])).toBe(0)
	})

	it('scores a parsed generate answer for the LLM only', () => {
		expect(scoreAnswer(generateTask, item(generateTask, 'g1'), RACERS.llm, 'A poem')).toBe(1)
		expect(isScorable(generateTask, item(generateTask, 'g1'), RACERS.jev)).toBe(false)
	})

	it('scores the jev_code racer on a combine task', () => {
		expect(scoreAnswer(compositeTask, item(compositeTask, 'r1'), RACERS.jevCode, true)).toBe(1)
	})
})

describe('missCredit and toCorrect', () => {
	it('a miss is 0 when scorable and null otherwise', () => {
		expect(missCredit(choiceTask, item(choiceTask, 't1'), RACERS.jev)).toBe(0)
		expect(missCredit(choiceTask, item(choiceTask, 't3'), RACERS.jev)).toBeNull()
	})

	it('correct means full credit', () => {
		expect(toCorrect(1)).toBe(true)
		expect(toCorrect(0.5)).toBe(false)
		expect(toCorrect(null)).toBeNull()
	})
})

describe('f1', () => {
	it('is 1 for two empty sets and 0 with no overlap', () => {
		expect(f1([], [])).toBe(1)
		expect(f1([1], [2])).toBe(0)
		expect(f1([1, 2], [2])).toBeCloseTo(2 / 3)
	})
})
```

`src/runner/cost.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { costUsd, priceFor } from './cost'

const TABLE = {
	checkedOn: '2026-10-01',
	models: {
		'jev-1.13.0': { inputPerM: 0.042, outputPerM: 0, source: 'https://docs.typesafe.ai/models' },
		'claude-opus-5-5': { inputPerM: 4, outputPerM: 20, source: 'https://platform.claude.com/x' }
	}
}

describe('costUsd', () => {
	it('is tokens times the per-million price', () => {
		expect(
			costUsd({ inputTokens: 1000, outputTokens: 500 }, TABLE.models['claude-opus-5-5'])
		).toBeCloseTo(0.014)
	})

	it('never charges Jev output tokens', () => {
		expect(
			costUsd({ inputTokens: 1_000_000, outputTokens: 999 }, TABLE.models['jev-1.13.0'])
		).toBeCloseTo(0.042)
	})

	it('is null when the price is unknown', () => {
		expect(costUsd({ inputTokens: 1, outputTokens: 1 }, null)).toBeNull()
	})
})

describe('priceFor', () => {
	it('returns the first model id with a price', () => {
		expect(priceFor(TABLE, ['jev-9.9.9', 'jev-1.13.0'])?.inputPerM).toBe(0.042)
		expect(priceFor(TABLE, ['gpt-x'])).toBeNull()
	})
})
```

`src/runner/totals.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { computeTotals } from './totals'
import type { ItemResult } from './types'

function result(overrides: Partial<ItemResult>): ItemResult {
	return {
		itemId: 'i',
		ok: true,
		raw: '',
		parsed: null,
		credit: 1,
		correct: true,
		latencyMs: 100,
		usage: { inputTokens: 10, outputTokens: 2 },
		costUsd: 0.5,
		...overrides
	}
}

describe('computeTotals', () => {
	it('sums tokens and cost, and averages credit over scored items', () => {
		const totals = computeTotals(
			[
				result({ itemId: 'a' }),
				result({ itemId: 'b', credit: 0.5, correct: false }),
				result({ itemId: 'c', credit: null, correct: null })
			],
			900
		)
		expect(totals).toEqual({
			items: 3,
			scored: 2,
			correct: 1,
			accuracy: 0.75,
			wallMs: 900,
			costUsd: 1.5,
			inputTokens: 30,
			outputTokens: 6,
			parseFailures: 0
		})
	})

	it('counts parse failures but not provider errors as parse failures', () => {
		const totals = computeTotals(
			[result({ ok: false, credit: 0 }), result({ ok: false, credit: 0, error: 'overloaded' })],
			1
		)
		expect(totals.parseFailures).toBe(1)
	})

	it('has no accuracy when nothing is scored, and no cost when any price is unknown', () => {
		const totals = computeTotals([result({ credit: null, correct: null, costUsd: null })], 1)
		expect(totals.accuracy).toBeNull()
		expect(totals.costUsd).toBeNull()
	})
})
```

- [ ] **Step 2: Run them to verify they fail**

Run: `corepack pnpm exec vitest run src/runner/score.test.ts src/runner/cost.test.ts src/runner/totals.test.ts`
Expected: FAIL (modules not found).

- [ ] **Step 3: Write score**

`src/runner/score.ts`:

```ts
import type { Label, Task, TaskItem } from '@/content/task-schema'
import {
	ANSWER_KEY,
	NOUL_THRESHOLD,
	QUESTION_KINDS,
	RACERS,
	TASK_KINDS,
	type Racer
} from '@/lib/constants'
import { lineNumberFromKey } from './jev-request'
import type { JevAnswer, JevAnswers } from './parse'
import type { LlmAnswer } from './types'

// Correctness rules from DESIGN 3.2.
export const SCORE_TOLERANCE = 0.5
export const FIND_LINES_F1_BAR = 0.8

const FULL = 1
const NONE = 0

function credit(right: boolean): number {
	return right ? FULL : NONE
}

function isYes(answer: JevAnswer | undefined): boolean | null {
	return answer?.type === QUESTION_KINDS.noul ? answer.noul >= NOUL_THRESHOLD : null
}

function isRecordLabel(label: Label): label is Record<string, boolean> {
	return typeof label === 'object' && !Array.isArray(label)
}

/** F1 of two sets of line numbers; two empty sets agree fully. */
export function f1(predicted: number[], expected: number[]): number {
	const want = new Set(expected)
	const got = new Set(predicted)
	if (want.size === 0 && got.size === 0) return FULL
	const hits = [...got].filter((line) => want.has(line)).length
	// 2PR / (P + R), written in counts so 0.8 comes out exactly 0.8.
	return (2 * hits) / (got.size + want.size)
}

function shareRight(label: Record<string, boolean>, right: (key: string) => boolean): number {
	const keys = Object.keys(label)
	return keys.length === 0 ? NONE : keys.filter(right).length / keys.length
}

/** Whether this racer's result on this item gets a credit at all (DESIGN 3.2). */
export function isScorable(task: Task, item: TaskItem, racer: Racer): boolean {
	if (task.kind === TASK_KINDS.generate) return racer === RACERS.llm
	if (item.label === undefined) return false
	// On a combine task Jev answers smaller questions; only Jev + Code is scored.
	return !(racer === RACERS.jev && task.combine)
}

export function missCredit(task: Task, item: TaskItem, racer: Racer): number | null {
	return isScorable(task, item, racer) ? NONE : null
}

export function toCorrect(value: number | null): boolean | null {
	return value === null ? null : value === FULL
}

export function scoreJev(task: Task, item: TaskItem, answers: JevAnswers): number | null {
	const { label } = item
	if (!isScorable(task, item, RACERS.jev) || label === undefined) return null
	const answer = answers[ANSWER_KEY]
	switch (task.kind) {
		case TASK_KINDS.choice:
			return credit(answer?.type === QUESTION_KINDS.choice && answer.choice === label)
		case TASK_KINDS.noul:
			return credit(isYes(answer) === label)
		case TASK_KINDS.score:
			return credit(
				answer?.type === QUESTION_KINDS.score &&
					typeof label === 'number' &&
					Math.abs(answer.score - label) <= SCORE_TOLERANCE
			)
		case TASK_KINDS.fanOut:
			return isRecordLabel(label)
				? shareRight(label, (key) => isYes(answers[key]) === label[key])
				: NONE
		case TASK_KINDS.findLines: {
			if (!Array.isArray(label)) return NONE
			const yesLines = Object.entries(answers).flatMap(([key, value]) => {
				const line = lineNumberFromKey(key)
				return line !== null && isYes(value) === true ? [line] : []
			})
			return credit(f1(yesLines, label) >= FIND_LINES_F1_BAR)
		}
		case TASK_KINDS.generate:
			return null
	}
}

/** Scores an answer in the LLM format: the LLM, the Code racer and Jev + Code. */
export function scoreAnswer(
	task: Task,
	item: TaskItem,
	racer: Racer,
	answer: LlmAnswer
): number | null {
	if (!isScorable(task, item, racer)) return null
	// generate: the LLM is right when its output parsed as non-empty text.
	if (task.kind === TASK_KINDS.generate) return FULL
	const { label } = item
	if (label === undefined) return null
	switch (task.kind) {
		case TASK_KINDS.fanOut: {
			if (!isRecordLabel(label) || typeof answer !== 'object' || Array.isArray(answer)) return NONE
			return shareRight(label, (key) => answer[key] === label[key])
		}
		case TASK_KINDS.findLines:
			return credit(
				Array.isArray(answer) && Array.isArray(label) && f1(answer, label) >= FIND_LINES_F1_BAR
			)
		default:
			return credit(answer === label)
	}
}
```

- [ ] **Step 4: Write cost and totals**

`src/runner/cost.ts`:

```ts
import type { PriceEntry, PriceTable } from '@/content/prices'
import type { Usage } from './types'

const TOKENS_PER_MILLION = 1_000_000

type Price = Pick<PriceEntry, 'inputPerM' | 'outputPerM'>

/** Token counts times the stored price; null means "price unknown". Never estimated. */
export function costUsd(usage: Usage, price: Price | null): number | null {
	if (!price) return null
	return (
		(usage.inputTokens * price.inputPerM + usage.outputTokens * price.outputPerM) /
		TOKENS_PER_MILLION
	)
}

/** The price of the first model id the table knows (the answering model first, then the requested one). */
export function priceFor(table: PriceTable, modelIds: string[]): PriceEntry | null {
	for (const modelId of modelIds) {
		const entry = table.models[modelId]
		if (entry) return entry
	}
	return null
}
```

`src/runner/totals.ts`:

```ts
import type { ItemResult, RunTotals } from './types'

export function computeTotals(results: ItemResult[], wallMs: number): RunTotals {
	const scored = results.filter((result) => result.credit !== null)
	const totalCredit = scored.reduce((sum, result) => sum + (result.credit ?? 0), 0)
	const anyUnknownPrice = results.some((result) => result.costUsd === null)
	return {
		items: results.length,
		scored: scored.length,
		correct: results.filter((result) => result.correct === true).length,
		accuracy: scored.length === 0 ? null : totalCredit / scored.length,
		wallMs,
		costUsd: anyUnknownPrice
			? null
			: results.reduce((sum, result) => sum + (result.costUsd ?? 0), 0),
		inputTokens: results.reduce((sum, result) => sum + result.usage.inputTokens, 0),
		outputTokens: results.reduce((sum, result) => sum + result.usage.outputTokens, 0),
		parseFailures: results.filter((result) => !result.ok && result.error === undefined).length
	}
}
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `corepack pnpm exec vitest run src/runner/score.test.ts src/runner/cost.test.ts src/runner/totals.test.ts`
Expected: PASS. Then `corepack pnpm typecheck` and `corepack pnpm lint`: clean.

- [ ] **Step 6: Commit**

```bash
git add src/runner/score.ts src/runner/score.test.ts src/runner/cost.ts src/runner/cost.test.ts src/runner/totals.ts src/runner/totals.test.ts
git commit -m "feat(runner): score answers, price token usage and sum run totals"
```

---

### Task 6: Code functions and combine

**Files:**

- Create: `src/runner/code/dates.ts`
- Create: `src/runner/code/code-fns.ts`
- Create: `src/runner/code/combine-fns.ts`
- Create: `src/runner/combine.ts`
- Test: `src/runner/code/code-fns.test.ts`, `src/runner/code/combine-fns.test.ts`, `src/runner/combine.test.ts`

**Interfaces:**

- Consumes: `JevAnswers` (Task 4); `scoreAnswer`, `missCredit`, `toCorrect` (Task 5); `computeTotals` (Task 5); `ItemResult`, `RunEvent`, `LlmAnswer` (Task 2); `Task`, `TaskItem`, `Structured` (Task 1); `CODE_FN_IDS`, `COMBINE_FN_IDS`, `DATE_ORDER`, `NOUL_THRESHOLD`, `RACERS`, `RUN_EVENTS`.
- Produces: `DateParts`, `compareDateParts(a, b): DateOrder`; `CODE_FNS: Record<CodeFnId, (state: Structured) => LlmAnswer>`; `CombineArgs` (`{ weights?: Record<string, number> }`), `CombineOutput` (`{ answer: LlmAnswer; detail?: Record<string, number> }`), `COMBINE_FNS`; `combineResult(task, item, jevResult, args?): ItemResult`, `createCombineTap(task, onEvent, args?): (event: RunEvent) => void`.

- [ ] **Step 1: Write the failing tests**

`src/runner/code/code-fns.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { CODE_FNS } from './code-fns'
import { compareDateParts } from './dates'

describe('compareDateParts', () => {
	it('orders two calendar dates', () => {
		expect(
			compareDateParts({ year: 2025, month: 3, day: 4 }, { year: 2025, month: 4, day: 3 })
		).toBe('first')
		expect(
			compareDateParts({ year: 2026, month: 1, day: 1 }, { year: 2025, month: 12, day: 31 })
		).toBe('second')
		expect(
			compareDateParts({ year: 2025, month: 3, day: 4 }, { year: 2025, month: 3, day: 4 })
		).toBe('same')
	})

	it('throws on a date that does not exist', () => {
		expect(() =>
			compareDateParts({ year: 2025, month: 2, day: 30 }, { year: 2025, month: 3, day: 1 })
		).toThrow()
	})
})

describe('CODE_FNS.compare_dates', () => {
	it('compares two ISO dates from the state', () => {
		expect(CODE_FNS.compare_dates({ first: '2025-03-04', second: '2025-04-03' })).toBe('first')
	})

	it('throws when the state is not two ISO dates', () => {
		expect(() => CODE_FNS.compare_dates('4 March')).toThrow()
	})
})
```

`src/runner/code/combine-fns.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { COMBINE_FNS } from './combine-fns'

const noul = (value: number) => ({ type: 'noul' as const, noul: value })
const choice = (picked: string) => ({
	type: 'choice' as const,
	choice: picked,
	probabilities: {},
	confidence: 1
})

describe('COMBINE_FNS', () => {
	it('count_true counts the yes Nouls as an option key', () => {
		expect(COMBINE_FNS.count_true({ e1: noul(0.9), e2: noul(0.1), e3: noul(0.5) })).toEqual({
			answer: '2'
		})
	})

	it('compare_dates builds both dates from the six Choice answers', () => {
		const answers = {
			first_day: choice('3'),
			first_month: choice('4'),
			first_year: choice('2025'),
			second_day: choice('4'),
			second_month: choice('3'),
			second_year: choice('2025')
		}
		expect(COMBINE_FNS.compare_dates(answers)).toEqual({ answer: 'second' })
		expect(() => COMBINE_FNS.compare_dates({ first_day: choice('3') })).toThrow()
	})

	it('weighted_composite averages the Nouls by weight and reports the composite', () => {
		const answers = { quality: noul(0.75), price: noul(0.25) }
		expect(COMBINE_FNS.weighted_composite(answers)).toEqual({
			answer: true,
			detail: { composite: 0.5 }
		})
		const weighted = COMBINE_FNS.weighted_composite(answers, { weights: { quality: 1, price: 3 } })
		expect(weighted.answer).toBe(false)
		expect(weighted.detail?.composite).toBeCloseTo(0.375)
	})
})
```

`src/runner/combine.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { combineResult, createCombineTap } from './combine'
import { choiceTask, countTask, item } from './testing/tasks'
import type { ItemResult, RunEvent } from './types'

const noul = (value: number) => ({ type: 'noul', noul: value })

function jevResult(overrides: Partial<ItemResult> = {}): ItemResult {
	return {
		itemId: 'c1',
		ok: true,
		raw: '{}',
		parsed: { e1: noul(0.9), e2: noul(0.2), e3: noul(0.8) },
		credit: null,
		correct: null,
		latencyMs: 120,
		usage: { inputTokens: 300, outputTokens: 20 },
		costUsd: 0.0000126,
		...overrides
	}
}

describe('combineResult', () => {
	it("scores the Code function's answer, with Jev's cost and Jev's latency plus Code's", () => {
		const result = combineResult(countTask, item(countTask, 'c1'), jevResult())
		expect(result.parsed).toEqual({ answer: '2' })
		expect(result.credit).toBe(1)
		expect(result.correct).toBe(true)
		expect(result.costUsd).toBe(0.0000126)
		expect(result.latencyMs).toBeGreaterThanOrEqual(120)
	})

	it("is a miss when Jev's call failed", () => {
		const result = combineResult(
			countTask,
			item(countTask, 'c1'),
			jevResult({ ok: false, parsed: null, error: 'overloaded' })
		)
		expect(result).toMatchObject({ ok: false, credit: 0, correct: false, error: 'overloaded' })
	})
})

describe('createCombineTap', () => {
	it('passes events through and adds the jev_code racer', () => {
		const seen: RunEvent[] = []
		const tap = createCombineTap(countTask, (event) => seen.push(event))
		tap({ type: 'item_started', racer: 'jev', itemId: 'c1', lane: 0, atMs: 0 })
		tap({ type: 'item_finished', racer: 'jev', lane: 0, atMs: 120, result: jevResult() })
		tap({
			type: 'run_finished',
			racer: 'jev',
			atMs: 120,
			totals: {
				items: 1,
				scored: 0,
				correct: 0,
				accuracy: null,
				wallMs: 120,
				costUsd: 0.0000126,
				inputTokens: 300,
				outputTokens: 20,
				parseFailures: 0
			}
		})
		expect(seen.map((event) => `${event.racer}:${event.type}`)).toEqual([
			'jev:item_started',
			'jev_code:item_started',
			'jev:item_finished',
			'jev_code:item_finished',
			'jev:run_finished',
			'jev_code:run_finished'
		])
		const last = seen.at(-1)
		expect(last?.type === 'run_finished' && last.totals.accuracy).toBe(1)
	})

	it('passes events through unchanged when the task has no combine', () => {
		const seen: RunEvent[] = []
		const tap = createCombineTap(choiceTask, (event) => seen.push(event))
		tap({ type: 'item_started', racer: 'jev', itemId: 't1', lane: 0, atMs: 0 })
		expect(seen).toHaveLength(1)
	})
})
```

- [ ] **Step 2: Run them to verify they fail**

Run: `corepack pnpm exec vitest run src/runner/code src/runner/combine.test.ts`
Expected: FAIL (modules not found).

- [ ] **Step 3: Write the date helper and the Code racer functions**

`src/runner/code/dates.ts`:

```ts
import { DATE_ORDER, type DateOrder } from '@/lib/constants'

export type DateParts = { year: number; month: number; day: number }

const MONTH_OFFSET = 1 // Date.UTC months start at 0

function toTime({ year, month, day }: DateParts): number {
	const time = Date.UTC(year, month - MONTH_OFFSET, day)
	const date = new Date(time)
	if (
		date.getUTCFullYear() !== year ||
		date.getUTCMonth() !== month - MONTH_OFFSET ||
		date.getUTCDate() !== day
	) {
		throw new Error(`Not a calendar date: ${year}-${month}-${day}`)
	}
	return time
}

/** Which of two calendar dates comes first. Throws on a date that doesn't exist. */
export function compareDateParts(first: DateParts, second: DateParts): DateOrder {
	const a = toTime(first)
	const b = toTime(second)
	if (a === b) return DATE_ORDER.same
	return a < b ? DATE_ORDER.first : DATE_ORDER.second
}
```

`src/runner/code/code-fns.ts`:

```ts
import { z } from 'zod'
import type { Structured } from '@/content/task-schema'
import { CODE_FN_IDS, type CodeFnId } from '@/lib/constants'
import type { LlmAnswer } from '@/runner/types'
import { compareDateParts, type DateParts } from './dates'

// The Code racer: deterministic functions from an item's state to an answer
// in the LLM format, timed, $0 (DESIGN 3.2). Content-specific functions are
// added in the slice that writes their content.

const isoDatePairSchema = z.object({ first: z.iso.date(), second: z.iso.date() })

function partsOfIso(iso: string): DateParts {
	const [year, month, day] = iso.split('-').map(Number)
	if (year === undefined || month === undefined || day === undefined) {
		throw new Error(`Not an ISO date: ${iso}`)
	}
	return { year, month, day }
}

export const CODE_FNS: Record<CodeFnId, (state: Structured) => LlmAnswer> = {
	[CODE_FN_IDS.compareDates]: (state) => {
		const { first, second } = isoDatePairSchema.parse(state)
		return compareDateParts(partsOfIso(first), partsOfIso(second))
	}
}
```

- [ ] **Step 4: Write the combine functions**

`src/runner/code/combine-fns.ts`:

```ts
import { COMBINE_FN_IDS, NOUL_THRESHOLD, QUESTION_KINDS, type CombineFnId } from '@/lib/constants'
import type { JevAnswers } from '@/runner/parse'
import type { LlmAnswer } from '@/runner/types'
import { compareDateParts, type DateParts } from './dates'

/** Arguments a view passes in, such as level 5's slider weights, so views never compute a score. */
export type CombineArgs = { weights?: Record<string, number> }

/** The combined answer in the LLM format, plus any numbers a view shows (level 5's composite). */
export type CombineOutput = { answer: LlmAnswer; detail?: Record<string, number> }

const DEFAULT_WEIGHT = 1
const DATE_SIDES = { first: 'first', second: 'second' } as const
type DateSide = (typeof DATE_SIDES)[keyof typeof DATE_SIDES]

function choiceNumber(answers: JevAnswers, key: string): number {
	const answer = answers[key]
	if (answer?.type !== QUESTION_KINDS.choice) throw new Error(`No Choice answer for ${key}`)
	const value = Number(answer.choice)
	if (!Number.isInteger(value)) throw new Error(`${key} is not a number: ${answer.choice}`)
	return value
}

function datePartsOf(answers: JevAnswers, side: DateSide): DateParts {
	return {
		year: choiceNumber(answers, `${side}_year`),
		month: choiceNumber(answers, `${side}_month`),
		day: choiceNumber(answers, `${side}_day`)
	}
}

function nouls(answers: JevAnswers): [string, number][] {
	return Object.entries(answers).flatMap(([key, answer]): [string, number][] =>
		answer.type === QUESTION_KINDS.noul ? [[key, answer.noul]] : []
	)
}

export const COMBINE_FNS: Record<
	CombineFnId,
	(answers: JevAnswers, args?: CombineArgs) => CombineOutput
> = {
	// Level 3: one Noul per list entry, summed into a count option key.
	[COMBINE_FN_IDS.countTrue]: (answers) => ({
		answer: String(nouls(answers).filter(([, value]) => value >= NOUL_THRESHOLD).length)
	}),
	// Level 3: day, month and year extracted by Choice for each date, compared in code.
	[COMBINE_FN_IDS.compareDates]: (answers) => ({
		answer: compareDateParts(
			datePartsOf(answers, DATE_SIDES.first),
			datePartsOf(answers, DATE_SIDES.second)
		)
	}),
	// Level 5: atomic Nouls combined with weights the user controls.
	[COMBINE_FN_IDS.weightedComposite]: (answers, args) => {
		const entries = nouls(answers)
		const weightOf = (key: string) => args?.weights?.[key] ?? DEFAULT_WEIGHT
		const totalWeight = entries.reduce((sum, [key]) => sum + weightOf(key), 0)
		if (totalWeight <= 0) throw new Error('The weights add up to nothing')
		const composite =
			entries.reduce((sum, [key, value]) => sum + weightOf(key) * value, 0) / totalWeight
		return { answer: composite >= NOUL_THRESHOLD, detail: { composite } }
	}
}
```

- [ ] **Step 5: Write combine**

`src/runner/combine.ts`:

```ts
import { z } from 'zod'
import type { Task, TaskItem } from '@/content/task-schema'
import { RACERS, RUN_EVENTS } from '@/lib/constants'
import { COMBINE_FNS, type CombineArgs } from './code/combine-fns'
import { jevAnswerSchema } from './parse'
import { missCredit, scoreAnswer, toCorrect } from './score'
import { computeTotals } from './totals'
import type { ItemResult, RunEvent } from './types'

const jevAnswersSchema = z.record(z.string(), jevAnswerSchema)

/**
 * Jev + Code for one item: the task's combine function applied to Jev's
 * parsed answers (DESIGN 3.2). Latency is Jev's plus the function's time;
 * cost is Jev's. Recordings store only Jev's results, so both modes derive
 * this the same way.
 */
export function combineResult(
	task: Task,
	item: TaskItem,
	jevResult: ItemResult,
	args?: CombineArgs
): ItemResult {
	if (!task.combine) throw new Error(`${task.id} has no combine function`)
	const miss = missCredit(task, item, RACERS.jevCode)
	const failed = { ...jevResult, ok: false, parsed: null, credit: miss, correct: toCorrect(miss) }
	const answers = jevAnswersSchema.safeParse(jevResult.parsed)
	if (!jevResult.ok || !answers.success) return failed

	const start = performance.now()
	try {
		const output = COMBINE_FNS[task.combine](answers.data, args)
		const elapsed = performance.now() - start
		const credit = scoreAnswer(task, item, RACERS.jevCode, output.answer)
		return {
			...jevResult,
			parsed: output,
			credit,
			correct: toCorrect(credit),
			latencyMs: jevResult.latencyMs + elapsed
		}
	} catch {
		// Jev's answers didn't fit the function (a missing or non-numeric
		// Choice): a miss, shown with Jev's raw response.
		return { ...failed, latencyMs: jevResult.latencyMs + (performance.now() - start) }
	}
}

/**
 * Wraps a RunEvent listener so every Jev event is followed by the matching
 * jev_code event. Works on live runs and replays alike. A task without
 * combine gets the listener back unchanged.
 */
export function createCombineTap(
	task: Task,
	onEvent: (event: RunEvent) => void,
	args?: CombineArgs
): (event: RunEvent) => void {
	if (!task.combine) return onEvent
	const itemsById = new Map(task.items.map((taskItem) => [taskItem.id, taskItem]))
	const results: ItemResult[] = []

	return (event) => {
		onEvent(event)
		if (event.racer !== RACERS.jev) return
		switch (event.type) {
			case RUN_EVENTS.itemStarted:
				onEvent({ ...event, racer: RACERS.jevCode })
				return
			case RUN_EVENTS.itemFinished: {
				const taskItem = itemsById.get(event.result.itemId)
				if (!taskItem) return
				const result = combineResult(task, taskItem, event.result, args)
				results.push(result)
				const codeMs = result.latencyMs - event.result.latencyMs
				onEvent({ ...event, racer: RACERS.jevCode, atMs: event.atMs + codeMs, result })
				return
			}
			case RUN_EVENTS.runFinished:
				// Code adds microseconds per item, so the wall time stays Jev's.
				onEvent({
					...event,
					racer: RACERS.jevCode,
					totals: computeTotals(results, event.totals.wallMs)
				})
				return
		}
	}
}
```

- [ ] **Step 6: Run the tests to verify they pass**

Run: `corepack pnpm exec vitest run src/runner/code src/runner/combine.test.ts`
Expected: PASS. Then `corepack pnpm typecheck` and `corepack pnpm lint`: clean.

- [ ] **Step 7: Commit**

```bash
git add src/runner/code src/runner/combine.ts src/runner/combine.test.ts
git commit -m "feat(runner): add code racer functions and the jev plus code combine"
```

---

### Task 7: Racers and the lane scheduler

**Files:**

- Create: `src/runner/racers.ts`
- Create: `src/runner/run.ts`
- Test: `src/runner/racers.test.ts`, `src/runner/run.test.ts`

**Interfaces:**

- Consumes: `buildJevRequest` (Task 3), `buildLlmPrompt` (Task 3), `parseJevAnswers`, `parseLlmAnswer` (Task 4), `scoreJev`, `scoreAnswer`, `missCredit`, `toCorrect`, `costUsd`, `priceFor`, `computeTotals` (Task 5), `CODE_FNS` (Task 6), `ProviderError` (Task 2), `PriceTable` (Task 1); `RACE_LANES`, `RACERS`, `RUN_EVENTS`.
- Produces: `JevCall` (`(body: JevRequestBody, signal: AbortSignal) => Promise<ProviderResult>`), `LlmCall` (`(prompt: string, signal: AbortSignal) => Promise<ProviderResult>`), `jevRacer({ task, call, prices }): ItemRunner`, `llmRacer({ task, modelId, call, prices }): ItemRunner`, `codeRacer(task): ItemRunner`; `RunOptions` (`{ lanes?, signal?, onEvent, now? }`), `runItems(task, racer, runItem, options): Promise<RunTotals | null>` (null when aborted).

- [ ] **Step 1: Write the failing tests**

`src/runner/racers.test.ts`:

```ts
import { describe, expect, it, vi } from 'vitest'
import { PROVIDER_ERROR_KINDS } from '@/lib/constants'
import { ProviderError } from './providers/provider-error'
import { codeRacer, jevRacer, llmRacer } from './racers'
import { choiceTask, codeDatesTask, item } from './testing/tasks'

const PRICES = {
	checkedOn: '2026-10-01',
	models: {
		'jev-1.13.0': { inputPerM: 0.042, outputPerM: 0, source: 'https://docs.typesafe.ai/models' },
		'claude-opus-5-5': { inputPerM: 4, outputPerM: 20, source: 'https://platform.claude.com/x' }
	}
}
const SIGNAL = new AbortController().signal

function jevText(choice: string): string {
	return JSON.stringify({
		model: 'jev-1.13.0',
		answers: { answer: { type: 'choice', choice, probabilities: {}, confidence: 0.9 } },
		usage: { input_tokens: 300, output_tokens: 20 }
	})
}

describe('jevRacer', () => {
	it('calls once, parses, scores and prices by the answering model', async () => {
		const call = vi.fn(async () => ({
			text: jevText('billing'),
			latencyMs: 140,
			usage: { inputTokens: 300, outputTokens: 20 },
			modelId: 'jev-1.13.0'
		}))
		const result = await jevRacer({ task: choiceTask, call, prices: PRICES })(
			item(choiceTask, 't1'),
			SIGNAL
		)
		expect(call).toHaveBeenCalledTimes(1)
		expect(result).toMatchObject({
			itemId: 't1',
			ok: true,
			credit: 1,
			correct: true,
			latencyMs: 140
		})
		expect(result.costUsd).toBeCloseTo((300 * 0.042) / 1_000_000)
	})

	it('records a provider error as a miss with its kind and body', async () => {
		const call = vi.fn(async () => {
			throw new ProviderError(PROVIDER_ERROR_KINDS.malformed, 422, '{"detail":"x"}', 30)
		})
		const result = await jevRacer({ task: choiceTask, call, prices: PRICES })(
			item(choiceTask, 't1'),
			SIGNAL
		)
		expect(result).toMatchObject({
			ok: false,
			raw: '{"detail":"x"}',
			parsed: null,
			credit: 0,
			correct: false,
			latencyMs: 30,
			costUsd: 0,
			error: 'malformed'
		})
	})

	it('rethrows anything that is not a provider error', async () => {
		const call = vi.fn(async () => {
			throw new DOMException('Aborted', 'AbortError')
		})
		await expect(
			jevRacer({ task: choiceTask, call, prices: PRICES })(item(choiceTask, 't1'), SIGNAL)
		).rejects.toThrow('Aborted')
	})
})

describe('llmRacer', () => {
	it('sends the built prompt and keeps an unparseable reply as a shown miss', async () => {
		const call = vi.fn(async (prompt: string) => {
			expect(prompt).toContain('Which team should handle this ticket?')
			return {
				text: 'I think billing.',
				latencyMs: 900,
				usage: { inputTokens: 500, outputTokens: 40 },
				modelId: 'claude-opus-5-5'
			}
		})
		const result = await llmRacer({
			task: choiceTask,
			modelId: 'claude-opus-5-5',
			call,
			prices: PRICES
		})(item(choiceTask, 't1'), SIGNAL)
		expect(result).toMatchObject({ ok: false, raw: 'I think billing.', parsed: null, credit: 0 })
		expect(result.costUsd).toBeCloseTo((500 * 4 + 40 * 20) / 1_000_000)
	})

	it('reports price unknown for a model with no stored price', async () => {
		const call = vi.fn(async () => ({
			text: '{"answer": "billing"}',
			latencyMs: 1,
			usage: { inputTokens: 1, outputTokens: 1 },
			modelId: 'some-model'
		}))
		const result = await llmRacer({
			task: choiceTask,
			modelId: 'some-model',
			call,
			prices: PRICES
		})(item(choiceTask, 't1'), SIGNAL)
		expect(result).toMatchObject({ ok: true, credit: 1, costUsd: null })
	})
})

describe('codeRacer', () => {
	it('runs the task code function for $0', async () => {
		const result = await codeRacer(codeDatesTask)(item(codeDatesTask, 'k1'), SIGNAL)
		expect(result).toMatchObject({ ok: true, parsed: 'first', credit: 1, costUsd: 0 })
		expect(result.usage).toEqual({ inputTokens: 0, outputTokens: 0 })
	})

	it('throws for a task without a code function', () => {
		expect(() => codeRacer(choiceTask)).toThrow()
	})
})
```

`src/runner/run.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { runItems } from './run'
import { taskSchema } from '@/content/task-schema'
import type { ItemResult, RunEvent } from './types'

const task = taskSchema.parse({
	id: 'test-lanes',
	kind: 'noul',
	version: 1,
	jev: { questions: { answer: { type: 'noul', instructions: 'Is it urgent?' } } },
	items: Array.from({ length: 6 }, (_, index) => ({
		id: `i${index}`,
		state: `msg ${index}`,
		label: true
	}))
})

function okResult(itemId: string): ItemResult {
	return {
		itemId,
		ok: true,
		raw: '',
		parsed: true,
		credit: 1,
		correct: true,
		latencyMs: 10,
		usage: { inputTokens: 1, outputTokens: 1 },
		costUsd: 0.001
	}
}

// Calls that resolve only when the test says so, so lane use can be observed.
// Like fetch, a pending call rejects when the signal aborts.
function deferredRunner() {
	const pending = new Map<string, () => void>()
	let inFlight = 0
	let maxInFlight = 0
	const runItem = (taskItem: { id: string }, signal: AbortSignal) =>
		new Promise<ItemResult>((resolve, reject) => {
			inFlight += 1
			maxInFlight = Math.max(maxInFlight, inFlight)
			signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')))
			pending.set(taskItem.id, () => {
				inFlight -= 1
				resolve(okResult(taskItem.id))
			})
		})
	return { runItem, pending, maxInFlight: () => maxInFlight }
}

const flush = () => new Promise((resolve) => setTimeout(resolve, 0))

describe('runItems', () => {
	it('runs items in order over at most 4 lanes and finishes with totals', async () => {
		const events: RunEvent[] = []
		const runner = deferredRunner()
		const done = runItems(task, 'jev', runner.runItem, { onEvent: (event) => events.push(event) })
		await flush()
		expect([...runner.pending.keys()]).toEqual(['i0', 'i1', 'i2', 'i3'])
		for (const id of ['i0', 'i1', 'i2', 'i3', 'i4', 'i5']) {
			runner.pending.get(id)?.()
			await flush()
		}
		const totals = await done
		expect(runner.maxInFlight()).toBe(4)
		expect(totals).toMatchObject({ items: 6, correct: 6, accuracy: 1 })
		expect(
			events
				.filter((event) => event.type === 'item_started')
				.map((event) => event.type === 'item_started' && event.itemId)
		).toEqual(['i0', 'i1', 'i2', 'i3', 'i4', 'i5'])
		expect(events.at(-1)?.type).toBe('run_finished')
	})

	it('stops on abort without a run_finished event', async () => {
		const events: RunEvent[] = []
		const controller = new AbortController()
		const runner = deferredRunner()
		const done = runItems(task, 'jev', runner.runItem, {
			signal: controller.signal,
			onEvent: (event) => events.push(event)
		})
		await flush()
		controller.abort()
		runner.pending.get('i0')?.()
		expect(await done).toBeNull()
		expect(events.some((event) => event.type === 'run_finished')).toBe(false)
	})

	it('measures times from the injected clock', async () => {
		let clock = 1000
		const events: RunEvent[] = []
		await runItems(
			task,
			'llm',
			async (taskItem) => {
				clock += 50
				return okResult(taskItem.id)
			},
			{ lanes: 1, now: () => clock, onEvent: (event) => events.push(event) }
		)
		const finished = events.at(-1)
		expect(finished?.type === 'run_finished' && finished.totals.wallMs).toBe(300)
	})
})
```

- [ ] **Step 2: Run them to verify they fail**

Run: `corepack pnpm exec vitest run src/runner/racers.test.ts src/runner/run.test.ts`
Expected: FAIL (modules not found).

- [ ] **Step 3: Write the racers**

`src/runner/racers.ts`:

```ts
import type { PriceTable } from '@/content/prices'
import type { Task, TaskItem } from '@/content/task-schema'
import { RACERS, type Racer } from '@/lib/constants'
import { CODE_FNS } from './code/code-fns'
import { costUsd, priceFor } from './cost'
import { buildJevRequest } from './jev-request'
import { buildLlmPrompt } from './llm-prompt'
import { parseJevAnswers, parseLlmAnswer } from './parse'
import { ProviderError } from './providers/provider-error'
import { missCredit, scoreAnswer, scoreJev, toCorrect } from './score'
import type { ItemResult, ItemRunner, JevRequestBody, ProviderResult } from './types'

// The provider call, with the key bound by the caller. The runner never sees a key.
export type JevCall = (body: JevRequestBody, signal: AbortSignal) => Promise<ProviderResult>
export type LlmCall = (prompt: string, signal: AbortSignal) => Promise<ProviderResult>

const NO_USAGE = { inputTokens: 0, outputTokens: 0 }
// A failed call is not billed, and Code costs nothing.
const NO_COST = 0

function failedResult(task: Task, item: TaskItem, racer: Racer, error: ProviderError): ItemResult {
	const credit = missCredit(task, item, racer)
	return {
		itemId: item.id,
		ok: false,
		raw: error.body,
		parsed: null,
		credit,
		correct: toCorrect(credit),
		latencyMs: error.latencyMs,
		usage: NO_USAGE,
		costUsd: NO_COST,
		error: error.kind
	}
}

async function callOnce(
	run: () => Promise<ProviderResult>
): Promise<{ ok: true; value: ProviderResult } | { ok: false; error: ProviderError }> {
	try {
		return { ok: true, value: await run() }
	} catch (error) {
		if (error instanceof ProviderError) return { ok: false, error }
		throw error
	}
}

export function jevRacer({
	task,
	call,
	prices
}: {
	task: Task
	call: JevCall
	prices: PriceTable
}): ItemRunner {
	return async (item, signal) => {
		const outcome = await callOnce(() => call(buildJevRequest(task, item), signal))
		if (!outcome.ok) return failedResult(task, item, RACERS.jev, outcome.error)
		const { text, latencyMs, usage, modelId } = outcome.value
		const parsed = parseJevAnswers(task, item, text)
		const credit = parsed.ok
			? scoreJev(task, item, parsed.parsed)
			: missCredit(task, item, RACERS.jev)
		return {
			itemId: item.id,
			ok: parsed.ok,
			raw: text,
			parsed: parsed.parsed,
			credit,
			correct: toCorrect(credit),
			latencyMs,
			usage,
			costUsd: costUsd(usage, priceFor(prices, [modelId]))
		}
	}
}

export function llmRacer({
	task,
	modelId,
	call,
	prices
}: {
	task: Task
	modelId: string
	call: LlmCall
	prices: PriceTable
}): ItemRunner {
	return async (item, signal) => {
		const outcome = await callOnce(() => call(buildLlmPrompt(task, item), signal))
		if (!outcome.ok) return failedResult(task, item, RACERS.llm, outcome.error)
		const { text, latencyMs, usage } = outcome.value
		const parsed = parseLlmAnswer(task.kind, text)
		const credit = parsed.ok
			? scoreAnswer(task, item, RACERS.llm, parsed.parsed)
			: missCredit(task, item, RACERS.llm)
		return {
			itemId: item.id,
			ok: parsed.ok,
			raw: text,
			parsed: parsed.parsed,
			credit,
			correct: toCorrect(credit),
			latencyMs,
			usage,
			costUsd: costUsd(usage, priceFor(prices, [outcome.value.modelId, modelId]))
		}
	}
}

/** The Code racer: the task's deterministic function, timed, $0 (DESIGN 3.2). */
export function codeRacer(task: Task): ItemRunner {
	const { code } = task
	if (!code) throw new Error(`${task.id} has no Code function`)
	const fn = CODE_FNS[code]
	return async (item) => {
		const start = performance.now()
		try {
			const answer = fn(item.state)
			const latencyMs = performance.now() - start
			const credit = scoreAnswer(task, item, RACERS.code, answer)
			return {
				itemId: item.id,
				ok: true,
				raw: JSON.stringify(answer),
				parsed: answer,
				credit,
				correct: toCorrect(credit),
				latencyMs,
				usage: NO_USAGE,
				costUsd: NO_COST
			}
		} catch {
			// The state doesn't fit the function: a miss, never hidden.
			const credit = missCredit(task, item, RACERS.code)
			return {
				itemId: item.id,
				ok: false,
				raw: '',
				parsed: null,
				credit,
				correct: toCorrect(credit),
				latencyMs: performance.now() - start,
				usage: NO_USAGE,
				costUsd: NO_COST
			}
		}
	}
}
```

- [ ] **Step 4: Write the lane scheduler**

`src/runner/run.ts`:

```ts
import type { Task } from '@/content/task-schema'
import { RACE_LANES, RUN_EVENTS, type Racer } from '@/lib/constants'
import { computeTotals } from './totals'
import type { ItemResult, ItemRunner, RunEvent, RunTotals } from './types'

export type RunOptions = {
	lanes?: number
	signal?: AbortSignal
	onEvent: (event: RunEvent) => void
	// Injected in tests; performance.now() otherwise.
	now?: () => number
}

/**
 * Runs a task's items in order over parallel lanes (RACE_LANES for every
 * racer), emitting RunEvents as calls start and finish. Resolves with the
 * totals, or null when aborted, in which case no run_finished is emitted.
 */
export async function runItems(
	task: Task,
	racer: Racer,
	runItem: ItemRunner,
	options: RunOptions
): Promise<RunTotals | null> {
	const { lanes = RACE_LANES, onEvent, now = () => performance.now() } = options
	const signal = options.signal ?? new AbortController().signal
	const origin = now()
	const elapsed = () => now() - origin
	const results: ItemResult[] = []
	let next = 0
	let firstStart: number | null = null
	let lastEnd = 0

	async function lane(laneIndex: number): Promise<void> {
		while (!signal.aborted) {
			const item = task.items[next]
			if (!item) return
			next += 1
			const startedAt = elapsed()
			firstStart ??= startedAt
			onEvent({
				type: RUN_EVENTS.itemStarted,
				racer,
				itemId: item.id,
				lane: laneIndex,
				atMs: startedAt
			})
			const result = await runItem(item, signal)
			if (signal.aborted) return
			const finishedAt = elapsed()
			lastEnd = Math.max(lastEnd, finishedAt)
			results.push(result)
			onEvent({ type: RUN_EVENTS.itemFinished, racer, lane: laneIndex, atMs: finishedAt, result })
		}
	}

	const laneCount = Math.min(lanes, task.items.length)
	try {
		await Promise.all(Array.from({ length: laneCount }, (_, laneIndex) => lane(laneIndex)))
	} catch (error) {
		if (signal.aborted) return null
		throw error
	}
	if (signal.aborted) return null

	const totals = computeTotals(results, lastEnd - (firstStart ?? 0))
	onEvent({ type: RUN_EVENTS.runFinished, racer, atMs: lastEnd, totals })
	return totals
}
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `corepack pnpm exec vitest run src/runner/racers.test.ts src/runner/run.test.ts`
Expected: PASS. Then `corepack pnpm typecheck` and `corepack pnpm lint`: clean.

- [ ] **Step 6: Commit**

```bash
git add src/runner/racers.ts src/runner/racers.test.ts src/runner/run.ts src/runner/run.test.ts
git commit -m "feat(runner): add the jev, llm and code racers and the lane scheduler"
```

---

### Task 8: Recording schema and replaySource

**Files:**

- Create: `src/content/recording-schema.ts`
- Create: `src/runner/replay.ts`
- Test: `src/content/recording-schema.test.ts`, `src/runner/replay.test.ts`

**Interfaces:**

- Consumes: `itemResultSchema`, `runTotalsSchema`, `RunEvent` (Task 2); `priceEntrySchema` (Task 1); `RACERS`, `RUN_EVENTS`, `JEV_MODEL_ALIAS`.
- Produces: `recordingEventSchema`, `recordingSchema`/`Recording` (`{ taskId, taskHash, racer: 'jev' | 'llm', modelId, recordedAt, price, lanes, events, totals }`), `recordingSlug({ racer, modelId }): string`; `replaySchedule(recording)`, `ReplayHandle` (`{ skip(): void; done: Promise<void> }`), `replaySource(recording, { onEvent, signal? }): ReplayHandle`.

- [ ] **Step 1: Write the failing tests**

`src/content/recording-schema.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { recordingSchema, recordingSlug } from './recording-schema'

const RECORDING = {
	taskId: 'test-choice',
	taskHash: 'a'.repeat(64),
	racer: 'jev',
	modelId: 'jev-1.13.0',
	recordedAt: '2026-10-02T10:00:00.000Z',
	price: { inputPerM: 0.042, outputPerM: 0, source: 'https://docs.typesafe.ai/models' },
	lanes: 4,
	events: [
		{
			itemId: 't1',
			lane: 0,
			startMs: 0,
			endMs: 140,
			ok: true,
			raw: '{}',
			parsed: {},
			credit: 1,
			correct: true,
			latencyMs: 140,
			usage: { inputTokens: 300, outputTokens: 20 },
			costUsd: 0.0000126
		}
	],
	totals: {
		items: 1,
		scored: 1,
		correct: 1,
		accuracy: 1,
		wallMs: 140,
		costUsd: 0.0000126,
		inputTokens: 300,
		outputTokens: 20,
		parseFailures: 0
	}
}

describe('recordingSchema', () => {
	it('accepts a recording', () => {
		expect(recordingSchema.safeParse(RECORDING).success).toBe(true)
	})

	it('rejects a recording with a malformed hash or racer', () => {
		expect(recordingSchema.safeParse({ ...RECORDING, taskHash: 'abc' }).success).toBe(false)
		expect(recordingSchema.safeParse({ ...RECORDING, racer: 'code' }).success).toBe(false)
	})
})

describe('recordingSlug', () => {
	it("is 'jev' for Jev and the model id for an LLM", () => {
		expect(recordingSlug({ racer: 'jev', modelId: 'jev-1.13.0' })).toBe('jev')
		expect(recordingSlug({ racer: 'llm', modelId: 'claude-opus-5-5' })).toBe('claude-opus-5-5')
	})
})
```

`src/runner/replay.test.ts`:

```ts
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { recordingSchema } from '@/content/recording-schema'
import { replaySchedule, replaySource } from './replay'
import type { RunEvent } from './types'

function event(itemId: string, lane: number, startMs: number, endMs: number) {
	return {
		itemId,
		lane,
		startMs,
		endMs,
		ok: true,
		raw: '{}',
		parsed: {},
		credit: 1,
		correct: true,
		latencyMs: endMs - startMs,
		usage: { inputTokens: 10, outputTokens: 1 },
		costUsd: 0.001
	}
}

const recording = recordingSchema.parse({
	taskId: 'test-choice',
	taskHash: 'b'.repeat(64),
	racer: 'llm',
	modelId: 'claude-opus-5-5',
	recordedAt: '2026-10-02T10:00:00.000Z',
	price: { inputPerM: 4, outputPerM: 20, source: 'https://platform.claude.com/x' },
	lanes: 4,
	events: [event('a', 0, 0, 900), event('b', 1, 5, 400), event('c', 1, 400, 1200)],
	totals: {
		items: 3,
		scored: 3,
		correct: 3,
		accuracy: 1,
		wallMs: 1200,
		costUsd: 0.003,
		inputTokens: 30,
		outputTokens: 3,
		parseFailures: 0
	}
})

const label = (e: RunEvent) =>
	e.type === 'item_started'
		? `start:${e.itemId}`
		: e.type === 'item_finished'
			? `end:${e.result.itemId}`
			: 'done'

beforeEach(() => vi.useFakeTimers())
afterEach(() => vi.useRealTimers())

describe('replaySchedule', () => {
	it('orders recorded events by time and ends with the recorded totals', () => {
		expect(replaySchedule(recording).map((entry) => label(entry.event))).toEqual([
			'start:a',
			'start:b',
			'end:b',
			'start:c',
			'end:a',
			'end:c',
			'done'
		])
	})
})

describe('replaySource', () => {
	it('fires each event at its recorded offset', () => {
		const seen: string[] = []
		replaySource(recording, { onEvent: (e) => seen.push(label(e)) })
		vi.advanceTimersByTime(399)
		expect(seen).toEqual(['start:a', 'start:b'])
		vi.advanceTimersByTime(1)
		expect(seen).toEqual(['start:a', 'start:b', 'end:b', 'start:c'])
		vi.advanceTimersByTime(800)
		expect(seen.at(-1)).toBe('done')
	})

	it('skip emits every remaining event at once, then resolves', async () => {
		const seen: string[] = []
		const handle = replaySource(recording, { onEvent: (e) => seen.push(label(e)) })
		vi.advanceTimersByTime(10)
		handle.skip()
		expect(seen).toEqual(['start:a', 'start:b', 'end:b', 'start:c', 'end:a', 'end:c', 'done'])
		await expect(handle.done).resolves.toBeUndefined()
		vi.advanceTimersByTime(5000)
		expect(seen).toHaveLength(7)
	})

	it('abort stops the replay without the final event', async () => {
		const seen: string[] = []
		const controller = new AbortController()
		const handle = replaySource(recording, {
			onEvent: (e) => seen.push(label(e)),
			signal: controller.signal
		})
		vi.advanceTimersByTime(10)
		controller.abort()
		vi.advanceTimersByTime(5000)
		await handle.done
		expect(seen).toEqual(['start:a', 'start:b'])
	})
})
```

- [ ] **Step 2: Run them to verify they fail**

Run: `corepack pnpm exec vitest run src/content/recording-schema.test.ts src/runner/replay.test.ts`
Expected: FAIL (modules not found).

- [ ] **Step 3: Write the recording schema**

`src/content/recording-schema.ts`:

```ts
import { z } from 'zod'
import { RACERS } from '@/lib/constants'
import { itemResultSchema, runTotalsSchema } from '@/runner/types'
import { priceEntrySchema } from './prices'

const SHA256_HEX = /^[0-9a-f]{64}$/

// One recorded call: its result plus when and in which lane it ran.
export const recordingEventSchema = itemResultSchema.extend({
	lane: z.number().int().nonnegative(),
	startMs: z.number().nonnegative(),
	endMs: z.number().nonnegative()
})

// content/recordings/<taskId>/<slug>.json (DESIGN 4.1). Only the recording
// CLI writes these; jev_code is derived from Jev's recording, never stored.
export const recordingSchema = z.object({
	taskId: z.string().min(1),
	taskHash: z.string().regex(SHA256_HEX),
	racer: z.enum([RACERS.jev, RACERS.llm]),
	// The versioned model that answered (for Jev, e.g. jev-1.13.0).
	modelId: z.string().min(1),
	recordedAt: z.iso.datetime(),
	// The price used for every cost in this file; null means "price unknown".
	price: priceEntrySchema.nullable(),
	lanes: z.number().int().positive(),
	events: z.array(recordingEventSchema).min(1),
	totals: runTotalsSchema
})
export type Recording = z.infer<typeof recordingSchema>

// Jev's file is jev.json, so a new Jev version replaces it in place.
const JEV_SLUG = 'jev'

export function recordingSlug(recording: Pick<Recording, 'racer' | 'modelId'>): string {
	return recording.racer === RACERS.jev ? JEV_SLUG : recording.modelId
}
```

- [ ] **Step 4: Write replaySource**

`src/runner/replay.ts`:

```ts
import type { Recording } from '@/content/recording-schema'
import { RUN_EVENTS } from '@/lib/constants'
import type { RunEvent } from './types'

export type ScheduledEvent = { atMs: number; event: RunEvent }

/** The recorded events in time order, ending with the recorded totals. */
export function replaySchedule(recording: Recording): ScheduledEvent[] {
	const { racer } = recording
	const entries: ScheduledEvent[] = []
	for (const { lane, startMs, endMs, ...result } of recording.events) {
		entries.push({
			atMs: startMs,
			event: { type: RUN_EVENTS.itemStarted, racer, itemId: result.itemId, lane, atMs: startMs }
		})
		entries.push({
			atMs: endMs,
			event: { type: RUN_EVENTS.itemFinished, racer, lane, atMs: endMs, result }
		})
	}
	// Stable sort: an item's start stays ahead of its own finish.
	entries.sort((a, b) => a.atMs - b.atMs)
	const endAt = entries.reduce((latest, entry) => Math.max(latest, entry.atMs), 0)
	entries.push({
		atMs: endAt,
		event: { type: RUN_EVENTS.runFinished, racer, atMs: endAt, totals: recording.totals }
	})
	return entries
}

export type ReplayOptions = { onEvent: (event: RunEvent) => void; signal?: AbortSignal }
export type ReplayHandle = { skip: () => void; done: Promise<void> }

/**
 * Plays a Recording as RunEvents at their recorded offsets, so replays run at
 * real speed (R7). skip() emits every remaining event at once (DESIGN 3.2).
 * done resolves when the last event fires, after skip, or on abort.
 */
export function replaySource(
	recording: Recording,
	{ onEvent, signal }: ReplayOptions
): ReplayHandle {
	const schedule = replaySchedule(recording)
	const timers: ReturnType<typeof setTimeout>[] = []
	let emitted = 0
	let resolveDone: () => void = () => undefined
	const done = new Promise<void>((resolve) => {
		resolveDone = resolve
	})

	function stop(): void {
		for (const timer of timers) clearTimeout(timer)
		timers.length = 0
		resolveDone()
	}

	function emitThrough(index: number): void {
		while (emitted <= index && emitted < schedule.length) {
			const entry = schedule[emitted]
			emitted += 1
			if (entry) onEvent(entry.event)
		}
		if (emitted >= schedule.length) stop()
	}

	if (signal?.aborted) {
		stop()
		return { skip: () => undefined, done }
	}
	signal?.addEventListener('abort', stop, { once: true })
	schedule.forEach((entry, index) => {
		timers.push(setTimeout(() => emitThrough(index), entry.atMs))
	})

	return {
		skip: () => {
			if (!signal?.aborted) emitThrough(schedule.length - 1)
		},
		done
	}
}
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `corepack pnpm exec vitest run src/content/recording-schema.test.ts src/runner/replay.test.ts`
Expected: PASS. Then `corepack pnpm typecheck` and `corepack pnpm lint`: clean.

- [ ] **Step 6: Commit**

```bash
git add src/content/recording-schema.ts src/content/recording-schema.test.ts src/runner/replay.ts src/runner/replay.test.ts
git commit -m "feat(runner): add the recording schema and real-speed replay"
```

---

### Task 9: Task hash and the content registries

**Files:**

- Create: `src/content/task-hash.ts`
- Create: `src/content/tasks.ts`
- Create: `src/content/recordings.ts`
- Test: `src/content/task-hash.test.ts`, `src/content/registry.test.ts`

**Interfaces:**

- Consumes: `taskSchema`, `Task` (Task 1); `recordingSchema`, `Recording`, `recordingSlug` (Task 8); `CLAUDE_MODELS`, `RACERS`.
- Produces: `canonicalJson(value): string`, `taskHash(task): string` (sha256 hex); `TASKS: ReadonlyMap<string, Task>`, `getTask(id): Task`; `RECORDINGS: Recording[]`, `currentRecordings(taskId): Recording[]` (server-only; hash-matching only).

- [ ] **Step 1: Write the failing tests**

`src/content/task-hash.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { choiceTask } from '@/runner/testing/tasks'
import { canonicalJson, taskHash } from './task-hash'

describe('canonicalJson', () => {
	it('sorts object keys at every depth and keeps array order', () => {
		expect(canonicalJson({ b: 1, a: { d: [2, 1], c: null } })).toBe(
			'{"a":{"c":null,"d":[2,1]},"b":1}'
		)
	})
})

describe('taskHash', () => {
	it('is a stable sha256 that ignores key order', () => {
		const reordered = JSON.parse(JSON.stringify({ items: choiceTask.items, ...choiceTask }))
		expect(taskHash(choiceTask)).toMatch(/^[0-9a-f]{64}$/)
		expect(taskHash(reordered)).toBe(taskHash(choiceTask))
	})

	it('changes when any content changes', () => {
		const edited = { ...choiceTask, items: [{ ...choiceTask.items[0], id: 't1', state: 'Edited' }] }
		expect(taskHash(edited)).not.toBe(taskHash(choiceTask))
	})
})
```

`src/content/registry.test.ts`:

```ts
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { CLAUDE_MODELS, RACERS } from '@/lib/constants'
import { recordingSlug } from './recording-schema'
import { currentRecordings, RECORDINGS } from './recordings'
import { TASKS } from './tasks'

const CONTENT = join(process.cwd(), 'content')
const TASKS_DIR = join(CONTENT, 'tasks')
const RECORDINGS_DIR = join(CONTENT, 'recordings')

function jsonFiles(dir: string): string[] {
	if (!existsSync(dir)) return []
	return readdirSync(dir, { recursive: true, encoding: 'utf8' })
		.filter((file) => file.endsWith('.json'))
		.map((file) => file.replaceAll('\\', '/'))
}

describe('content registries', () => {
	it('imports every task file, keyed by its id', () => {
		const ids = jsonFiles(TASKS_DIR).map((file) => {
			const parsed: unknown = JSON.parse(readFileSync(join(TASKS_DIR, file), 'utf8'))
			expect(file).toBe(`${(parsed as { id: string }).id}.json`)
			return (parsed as { id: string }).id
		})
		expect([...TASKS.keys()].sort()).toEqual(ids.sort())
	})

	it('imports every recording file at content/recordings/<taskId>/<slug>.json', () => {
		const onDisk = jsonFiles(RECORDINGS_DIR).sort()
		const imported = RECORDINGS.map(
			(recording) => `${recording.taskId}/${recordingSlug(recording)}.json`
		).sort()
		expect(imported).toEqual(onDisk)
	})

	it('has a current recording for Jev and all three Claude models for every task', () => {
		for (const taskId of TASKS.keys()) {
			const slugs = currentRecordings(taskId).map(recordingSlug)
			for (const slug of [RACERS.jev, ...Object.values(CLAUDE_MODELS)]) {
				expect(slugs, `${taskId} needs a current ${slug} recording`).toContain(slug)
			}
		}
	})
})
```

Note for the implementer: replace the two `(parsed as { id: string })` casts with a Zod parse, `z.object({ id: z.string() }).parse(parsed).id`, so the test adds no type assertions.

- [ ] **Step 2: Run them to verify they fail**

Run: `corepack pnpm exec vitest run src/content/task-hash.test.ts src/content/registry.test.ts`
Expected: FAIL (modules not found).

- [ ] **Step 3: Write the task hash**

`src/content/task-hash.ts`:

```ts
import { createHash } from 'node:crypto'
import type { Task } from './task-schema'

// Runs on the server and in the CLI only (node:crypto). The UI shows a
// recording only when its taskHash matches the current task, so edited
// content never shows stale results (DESIGN 4.1).

/** JSON with object keys sorted at every depth, so key order never changes a hash. */
export function canonicalJson(value: unknown): string {
	if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`
	if (value !== null && typeof value === 'object') {
		const entries = Object.entries(value)
			.filter(([, entry]) => entry !== undefined)
			.sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
			.map(([key, entry]) => `${JSON.stringify(key)}:${canonicalJson(entry)}`)
		return `{${entries.join(',')}}`
	}
	return JSON.stringify(value)
}

export function taskHash(task: Task): string {
	return createHash('sha256').update(canonicalJson(task)).digest('hex')
}
```

- [ ] **Step 4: Write the registries**

`src/content/tasks.ts`:

```ts
import { taskSchema, type Task } from './task-schema'

// Every file in content/tasks/ is imported here, so content renders at build
// time (DESIGN 4.1). registry.test.ts fails when a file is missing.
// Slice 3 adds the first task.
const RAW_TASKS: unknown[] = []

// Parsed at import, so a malformed file fails the build at prerender.
export const TASKS: ReadonlyMap<string, Task> = new Map(
	RAW_TASKS.map((raw) => {
		const task = taskSchema.parse(raw)
		return [task.id, task]
	})
)

export function getTask(id: string): Task {
	const task = TASKS.get(id)
	if (!task) throw new Error(`Unknown task: ${id}`)
	return task
}
```

`src/content/recordings.ts`:

```ts
import 'server-only'
import { recordingSchema, type Recording } from './recording-schema'
import { taskHash } from './task-hash'
import { getTask } from './tasks'

// Every file in content/recordings/ is imported here. Server-only: a page's
// server component loads only its own recordings and passes them down as
// props, so recordings never ship in a shared bundle (R79).
// registry.test.ts fails when a file is missing.
const RAW_RECORDINGS: unknown[] = []

export const RECORDINGS: Recording[] = RAW_RECORDINGS.map((raw) => recordingSchema.parse(raw))

/** A task's recordings whose hash matches the current task file. */
export function currentRecordings(taskId: string): Recording[] {
	const hash = taskHash(getTask(taskId))
	return RECORDINGS.filter(
		(recording) => recording.taskId === taskId && recording.taskHash === hash
	)
}
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `corepack pnpm exec vitest run src/content`
Expected: PASS (the registry tests pass with no task files yet). Then `corepack pnpm typecheck` and `corepack pnpm lint`: clean.

- [ ] **Step 6: Commit**

```bash
git add src/content/task-hash.ts src/content/task-hash.test.ts src/content/tasks.ts src/content/recordings.ts src/content/registry.test.ts
git commit -m "feat(content): add the task hash and the task and recording registries"
```

---

### Task 10: Keep DESIGN.md in step and run every gate

**Files:**

- Modify: `DESIGN.md` (sections 3.1, 3.2, 4.1)

**Interfaces:**

- Consumes: everything above. Produces: no code.

- [ ] **Step 1: Update DESIGN.md 3.1**

In the `ItemResult` type block, after the `correct` line, add `credit: number | null // 1 or 0, or the share right for fan_out; null = not scored` and change the `correct` comment to `// credit === 1; a parse failure or an error is a miss; null = "not scored"`. In `RunTotals`, change the `accuracy` comment to `// total credit / scored; null when nothing is scored` and the `correct` comment to `// items with full credit`. In `RunEvent`, add `lane: number` to `item_started` and `item_finished`.

- [ ] **Step 2: Update DESIGN.md 3.2**

- `llm-prompt.ts` bullet: append "When a task leaves `llm` out, the LLM's question is derived from Jev's, so the two can't drift."
- `combine` bullet: append "On a combine task the item's label is the combined answer's label: Jev alone is not scored there, and the LLM answers the task's `llm` question."
- `run.ts` bullet: change the signature to `runItems(task, racer, runItem, { lanes, signal, onEvent })`, where `runItem` is the racer's `ItemRunner` (`jevRacer`, `llmRacer` or `codeRacer`, in `racers.ts`). Provider calls are passed in with the key bound, so the runner never holds a key.
- `replay.ts` bullet: note that `replaySource` returns `{ skip, done }`.

- [ ] **Step 3: Update DESIGN.md 4.1**

Replace the `content/tasks/<taskId>.json` row's shape with: `{ id, kind, version, jev: { questions } | { perLine } | { raw }, llm?: question | { instructions }, code?: codeFnId, combine?: codeFnId, items: [{ id, state, label?, note?, questions? }] }`. In the recordings row, add `racer` after `taskHash`. Below the table, add one sentence: "`src/content/tasks.ts` and the server-only `src/content/recordings.ts` import every file by name; a Vitest test fails when a file on disk is missing from them."

- [ ] **Step 4: Run every gate**

Run each and expect success:

```bash
corepack pnpm lint
corepack pnpm typecheck
corepack pnpm format
corepack pnpm format:check
corepack pnpm test
corepack pnpm build
```

Also check `src/runner/` stays browser-safe: `git grep -nE "from 'node:|server-only|@/server/|from 'react'|from 'next" -- src/runner` must print nothing.

- [ ] **Step 5: Commit**

```bash
git add DESIGN.md
git add -u
git commit -m "docs(design): record the runner's credit, lanes and task shapes"
```
