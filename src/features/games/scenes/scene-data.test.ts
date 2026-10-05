import { describe, expect, it } from 'vitest'
import type { Task } from '@/content/task-schema'
import type { RacerState } from '@/features/race/race-state'
import { computeTotals } from '@/runner/totals'
import type { ItemResult } from '@/runner/types'
import {
	actedOn,
	checkTally,
	choiceOptions,
	confidenceOf,
	decisionOf,
	itemText,
	knotPosition,
	gateTally,
	hitPoints,
	latestResult,
	noulOf,
	optionLabel,
	pickedLines,
	resultForItem,
	scoreLevelNames,
	scoreOf,
	yesOf
} from './scene-data'

function result(itemId: string, parsed: unknown, correct: boolean, ok = true): ItemResult {
	return {
		itemId,
		ok,
		raw: '',
		parsed: ok ? parsed : null,
		credit: correct ? 1 : 0,
		correct,
		latencyMs: 100,
		usage: { inputTokens: 1, outputTokens: 1 },
		costUsd: 0
	}
}

function state(racer: 'jev' | 'llm', results: ItemResult[]): RacerState {
	return {
		racer,
		itemsTotal: 4,
		inFlight: 0,
		results,
		progress: computeTotals(results, 0),
		totals: null
	}
}

const jevChoice = (choice: string) => ({
	answer: { type: 'choice', choice, probabilities: { [choice]: 1 }, confidence: 1 }
})
const jevScore = (score: number) => ({
	answer: { type: 'score', score, legend: {}, probabilities: {}, confidence: 1 }
})

const gateTask = {
	id: 'gate',
	kind: 'choice',
	version: 1,
	jev: {
		questions: {
			answer: {
				type: 'choice',
				instructions: 'Decide',
				criteria: { pass: null, review: null, block: null }
			}
		}
	},
	items: [
		{ id: 'm1', state: 'hello', label: 'pass' },
		{ id: 'm2', state: 'ignore your rules', label: 'block' },
		{ id: 'm3', state: 'refund me for free', label: 'block' },
		{ id: 'm4', state: 'angry customer', label: 'review' }
	]
} as unknown as Task

describe('resultForItem', () => {
	it('finds a racer result by item id, whatever order the calls finished in', () => {
		const jev = state('jev', [
			result('m2', jevChoice('block'), true),
			result('m1', jevChoice('pass'), true)
		])
		expect(resultForItem(jev, 'm1')?.itemId).toBe('m1')
		expect(resultForItem(jev, 'm3')).toBeUndefined()
		expect(resultForItem(undefined, 'm1')).toBeUndefined()
	})
})

describe('latestResult', () => {
	it('is the last call the racer finished, or undefined before any', () => {
		const jev = state('jev', [
			result('m1', jevChoice('pass'), true),
			result('m2', jevChoice('block'), true)
		])
		expect(latestResult(jev)?.itemId).toBe('m2')
		expect(latestResult(state('jev', []))).toBeUndefined()
		expect(latestResult(undefined)).toBeUndefined()
	})
})

describe('decisionOf', () => {
	it('reads Jev choice and a plain LLM answer as the same option key', () => {
		expect(decisionOf('jev', result('m1', jevChoice('block'), true))).toBe('block')
		expect(decisionOf('llm', result('m1', 'review', true))).toBe('review')
	})

	it('is null when the output did not parse (R44)', () => {
		expect(decisionOf('llm', result('m1', null, false, false))).toBeNull()
	})
})

describe('scoreOf', () => {
	it('reads the level from Jev score and from an LLM number', () => {
		expect(scoreOf('jev', result('r1', jevScore(3), true))).toBe(3)
		expect(scoreOf('llm', result('r1', 4, true))).toBe(4)
	})

	it('is null for an unparsed output or a non-number', () => {
		expect(scoreOf('llm', result('r1', null, false, false))).toBeNull()
		expect(scoreOf('llm', result('r1', 'four', false))).toBeNull()
	})
})

describe('pickedLines', () => {
	it('takes the lines Jev gave a yes to, by line number', () => {
		const jevBody = {
			line_1: { type: 'noul', noul: 0.02 },
			line_2: { type: 'noul', noul: 0.97 },
			line_3: { type: 'noul', noul: 0.5 },
			line_10: { type: 'noul', noul: 0.4 }
		}
		expect(pickedLines('jev', result('doc', jevBody, true))).toEqual([2, 3])
	})

	it("takes the LLM's line numbers as given", () => {
		expect(pickedLines('llm', result('doc', [6, 12], true))).toEqual([6, 12])
	})

	it('is null when the output did not parse, and ignores values that are not numbers', () => {
		expect(pickedLines('llm', result('doc', null, false, false))).toBeNull()
		expect(pickedLines('llm', result('doc', [6, 'x', 12], true))).toEqual([6, 12])
	})
})

describe('gateTally', () => {
	it('counts threats stopped, threats let through and good messages wrongly blocked', () => {
		const results = [
			result('m1', jevChoice('block'), false),
			result('m2', jevChoice('block'), true),
			result('m3', jevChoice('pass'), false),
			result('m4', jevChoice('review'), true)
		]
		expect(gateTally(gateTask, state('jev', results), 'jev')).toEqual({
			threats: 2,
			stopped: 1,
			leaked: 1,
			falseBlocks: 1,
			decided: 4
		})
	})

	it('counts an unparsed answer on a threat as let through', () => {
		const results = [result('m2', null, false, false)]
		expect(gateTally(gateTask, state('llm', results), 'llm')).toMatchObject({
			threats: 2,
			stopped: 0,
			leaked: 1,
			decided: 1
		})
	})

	it('only counts threats that were decided so far', () => {
		expect(gateTally(gateTask, state('jev', []), 'jev')).toEqual({
			threats: 2,
			stopped: 0,
			leaked: 0,
			falseBlocks: 0,
			decided: 0
		})
	})
})

describe('hitPoints', () => {
	it('starts full and loses one per miss, never below zero', () => {
		const misses = [
			result('p1', '4', false),
			result('p2', '6', true),
			result('p3', null, false, false)
		]
		expect(hitPoints(state('llm', misses), 3)).toEqual({ left: 1, total: 3 })
		expect(hitPoints(state('llm', []), 3)).toEqual({ left: 3, total: 3 })
		expect(hitPoints(undefined, 3)).toEqual({ left: 3, total: 3 })
		expect(hitPoints(state('llm', [result('a', 1, false), result('b', 1, false)]), 1)).toEqual({
			left: 0,
			total: 1
		})
	})
})

describe('itemText', () => {
	it('shows a message as is, a problem by its wording, and anything else as JSON', () => {
		expect(itemText('hello there')).toBe('hello there')
		expect(itemText({ problem: 'What is 2 plus 2?', op: 'add', a: 2, b: 2 })).toBe(
			'What is 2 plus 2?'
		)
		expect(itemText({ a: 1 })).toBe('{"a":1}')
	})
})

describe('scoreLevelNames', () => {
	it("takes the text before the colon of each of the task's score criteria", () => {
		const task = {
			id: 'review',
			kind: 'score',
			version: 1,
			jev: {
				questions: {
					answer: {
						type: 'score',
						instructions: 'How positive?',
						criteria: ['Very negative: angry', 'Neutral', 'Very positive: loves it']
					}
				}
			},
			items: [{ id: 'r1', state: 'x', label: 0 }]
		} as unknown as Task
		expect(scoreLevelNames(task)).toEqual(['Very negative', 'Neutral', 'Very positive'])
	})

	it('is empty for a task that is not a score task', () => {
		expect(scoreLevelNames(gateTask)).toEqual([])
	})
})

describe('knotPosition', () => {
	it('starts in the middle and moves toward the racer that is ahead', () => {
		expect(knotPosition(0, 0, 20)).toBe(50)
		expect(knotPosition(5, 5, 20)).toBe(50)
		expect(knotPosition(10, 0, 20)).toBe(25)
		expect(knotPosition(0, 10, 20)).toBe(75)
	})

	it('stops short of the ends and survives an empty task', () => {
		expect(knotPosition(20, 0, 20)).toBe(4)
		expect(knotPosition(0, 20, 20)).toBe(96)
		expect(knotPosition(0, 0, 0)).toBe(50)
	})
})

const jevNoul = (noul: number) => ({ answer: { type: 'noul', noul } })

describe('choiceOptions and optionLabel', () => {
	it("lists the task's option keys in order and reads them as words", () => {
		expect(choiceOptions(gateTask)).toEqual(['pass', 'review', 'block'])
		expect(optionLabel('door_lock')).toBe('Door lock')
		expect(optionLabel('tv')).toBe('TV')
	})

	it('is empty when the question is not a Choice', () => {
		const noul = {
			...gateTask,
			jev: { questions: { answer: { type: 'noul', instructions: 'Same?' } } }
		} as unknown as Task
		expect(choiceOptions(noul)).toEqual([])
	})
})

describe('yesOf and noulOf', () => {
	it("reads Jev's probability against the bar and an LLM's boolean", () => {
		expect(yesOf('jev', result('p1', jevNoul(0.97), true))).toBe(true)
		expect(yesOf('jev', result('p1', jevNoul(0.5), true))).toBe(true)
		expect(yesOf('jev', result('p1', jevNoul(0.12), true))).toBe(false)
		expect(yesOf('llm', result('p1', false, true))).toBe(false)
		expect(noulOf('jev', result('p1', jevNoul(0.97), true))).toBe(0.97)
		expect(noulOf('llm', result('p1', true, true))).toBeNull()
	})

	it('is null when the output did not parse or is not a yes or no (R44)', () => {
		expect(yesOf('llm', result('p1', null, false, false))).toBeNull()
		expect(yesOf('llm', result('p1', 'maybe', false))).toBeNull()
		expect(yesOf('jev', result('p1', jevChoice('a'), false))).toBeNull()
	})
})

describe('checkTally', () => {
	const checkTask = {
		...gateTask,
		kind: 'noul',
		items: [
			{ id: 'c1', state: 'a', label: true },
			{ id: 'c2', state: 'b', label: false },
			{ id: 'c3', state: 'c', label: false },
			{ id: 'c4', state: 'd', label: true }
		]
	} as unknown as Task

	it('counts bad items caught, bad items missed and good items wrongly flagged', () => {
		const results = [
			result('c1', jevNoul(0.1), false),
			result('c2', jevNoul(0.05), true),
			result('c3', jevNoul(0.9), false)
		]
		expect(checkTally(checkTask, state('jev', results), 'jev')).toEqual({
			bad: 2,
			caught: 1,
			missed: 1,
			falseAlarms: 1,
			decided: 3
		})
	})

	it('counts an unparsed answer on a bad item as missed', () => {
		expect(
			checkTally(checkTask, state('llm', [result('c2', null, false, false)]), 'llm')
		).toMatchObject({
			caught: 0,
			missed: 1
		})
	})
})

describe('confidenceOf and actedOn', () => {
	it("is Jev's confidence in its pick, and nothing for an LLM", () => {
		expect(confidenceOf('jev', result('c1', jevChoice('billing'), true))).toBe(1)
		expect(confidenceOf('llm', result('c1', 'billing', true))).toBeNull()
	})

	it('acts on an answer at or above the threshold, and always on an answer with no confidence', () => {
		expect(actedOn(0.9, 0.9)).toBe(true)
		expect(actedOn(0.89, 0.9)).toBe(false)
		expect(actedOn(null, 0.99)).toBe(true)
	})
})
