import { describe, expect, it } from 'vitest'
import type { Task } from '@/content/task-schema'
import { initialRaceState, raceReducer, type RaceState } from '@/features/race/race-state'
import type { Racer } from '@/lib/constants'
import type { ItemResult } from '@/runner/types'
import {
	answeredPrefix,
	codeDays,
	fanOutKeys,
	mazePath,
	playFor,
	plays,
	scoreOffset,
	tagCalls,
	tagChances,
	tagsOf
} from './play-data'
import { checkTally, yesOf } from './scene-data'

function result(itemId: string, parsed: unknown, correct: boolean | null = true): ItemResult {
	return {
		itemId,
		ok: parsed !== null,
		raw: '',
		parsed,
		credit: correct === null ? null : correct ? 1 : 0,
		correct,
		latencyMs: 50,
		usage: { inputTokens: 1, outputTokens: 1 },
		costUsd: 0
	}
}

function race(entries: { racer: Racer; result: ItemResult }[], total: number): RaceState {
	return entries.reduce<RaceState>(
		(state, { racer, result: item }) =>
			raceReducer(state, { type: 'item_finished', racer, lane: 1, atMs: 10, result: item }),
		initialRaceState(['jev', 'jev_code', 'llm'], total)
	)
}

const noul = (value: number) => ({ type: 'noul', noul: value })

const hoopsTask = {
	id: 'hoops',
	kind: 'fan_out',
	version: 1,
	jev: {
		questions: {
			urgent: { type: 'noul', instructions: 'Urgent?' },
			refund: { type: 'noul', instructions: 'Refund?' }
		}
	},
	items: [
		{ id: 'c1', state: 'Refund me today', label: { urgent: true, refund: true } },
		{ id: 'c2', state: 'Lovely chairs', label: { urgent: false, refund: false } },
		{ id: 'c3', state: 'Refund please, no rush', label: { urgent: false, refund: true } }
	]
} as unknown as Task

describe('plays and playFor', () => {
	it("pairs each finished result with its item's place in the task, in finish order", () => {
		const state = race(
			[
				{ racer: 'jev', result: result('c3', {}) },
				{ racer: 'jev', result: result('c1', {}) },
				{ racer: 'jev', result: result('gone', {}) }
			],
			3
		)
		const list = plays(hoopsTask, state.jev)
		expect(list.map((play) => play.index)).toEqual([2, 0])
		expect(playFor(list, 0)?.item.id).toBe('c1')
		expect(playFor(list, 1)).toBeUndefined()
		expect(plays(hoopsTask, undefined)).toEqual([])
	})

	it('answeredPrefix counts the items answered from the first one without a gap', () => {
		const state = race(
			[
				{ racer: 'jev', result: result('c1', {}) },
				{ racer: 'jev', result: result('c3', {}) }
			],
			3
		)
		expect(answeredPrefix(hoopsTask, state.jev)).toBe(1)
		expect(answeredPrefix(hoopsTask, undefined)).toBe(0)
	})
})

describe('fan-out tags', () => {
	it('lists the questions in task order', () => {
		expect(fanOutKeys(hoopsTask)).toEqual(['urgent', 'refund'])
	})

	it("reads Jev's Nouls against the scorer's bar and the LLM's booleans; null when unparsed", () => {
		const jev = result('c1', { urgent: noul(0.9), refund: noul(0.2) })
		expect(tagsOf('jev', jev)).toEqual({ urgent: true, refund: false })
		expect(tagChances('jev', jev)).toEqual({ urgent: 0.9, refund: 0.2 })
		expect(tagsOf('llm', result('c1', { urgent: true, refund: 'yes' }))).toEqual({ urgent: true })
		expect(tagChances('llm', result('c1', { urgent: true }))).toBeNull()
		expect(tagsOf('llm', result('c1', null))).toBeNull()
	})

	it('calls every hoop: swish, rim-out, a missed throw or a right pass', () => {
		const item = hoopsTask.items[2]
		if (!item) throw new Error('fixture')
		expect(tagCalls(item, { urgent: true, refund: false })).toEqual({
			urgent: 'rim_out',
			refund: 'missed'
		})
		expect(tagCalls(item, { urgent: false, refund: true })).toEqual({
			urgent: 'pass',
			refund: 'swish'
		})
	})
})

describe('Jev + Code', () => {
	it("codeDays reads the day count Code worked out; null for anyone else's result", () => {
		expect(codeDays('jev_code', result('d1', { answer: false, detail: { days: 37 } }))).toBe(37)
		expect(codeDays('jev', result('d1', { answer: noul(0.1) }))).toBeNull()
		expect(codeDays('jev_code', result('d1', null))).toBeNull()
	})

	it("yesOf reads Jev + Code's combined answer, so checkTally counts its lane", () => {
		expect(yesOf('jev_code', result('d1', { answer: false, detail: { days: 37 } }))).toBe(false)
		const task = {
			...hoopsTask,
			kind: 'noul',
			items: [
				{ id: 'd1', state: 'late', label: false },
				{ id: 'd2', state: 'fine', label: true }
			]
		} as unknown as Task
		const state = race(
			[
				{ racer: 'jev_code', result: result('d1', { answer: false }) },
				{ racer: 'jev_code', result: result('d2', { answer: false }, false) }
			],
			2
		)
		expect(checkTally(task, state.jev_code, 'jev_code')).toEqual({
			bad: 1,
			caught: 1,
			missed: 0,
			falseAlarms: 1,
			decided: 2
		})
	})

	it('checkTally can treat a yes as the bad answer (a clickbait headline)', () => {
		const task = {
			...hoopsTask,
			kind: 'noul',
			items: [
				{ id: 'h1', state: 'You will not believe this', label: true },
				{ id: 'h2', state: 'Library opens', label: false }
			]
		} as unknown as Task
		const state = race(
			[
				{ racer: 'llm', result: result('h1', true) },
				{ racer: 'llm', result: result('h2', true, false) }
			],
			2
		)
		expect(checkTally(task, state.llm, 'llm', true)).toEqual({
			bad: 1,
			caught: 1,
			missed: 0,
			falseAlarms: 1,
			decided: 2
		})
	})
})

describe('scoreOffset', () => {
	const jevScore = (score: number) => ({
		answer: { type: 'score', score, legend: {}, probabilities: {}, confidence: 1 }
	})

	it('is how far a rating sits above (+) or below (-) the right level; null when unparsed', () => {
		expect(scoreOffset('jev', result('b1', jevScore(2.6)), 4)).toBeCloseTo(-1.4)
		expect(scoreOffset('llm', result('b1', 4), 3)).toBe(1)
		expect(scoreOffset('llm', result('b1', null), 3)).toBeNull()
		expect(scoreOffset('llm', result('b1', 4), undefined)).toBeNull()
	})
})

describe('mazePath', () => {
	it('walks the right turns from the start, heading up, one cell per junction', () => {
		const path = mazePath(['right', 'left', 'straight'])
		expect(path.cells).toEqual([
			{ x: 0, y: 0 },
			{ x: 1, y: 0 },
			{ x: 1, y: -1 },
			{ x: 1, y: -2 }
		])
		// At junction 0 the robot faces up: left is west, straight is up, right is east.
		expect(path.junctions[0]?.exits).toEqual({
			left: { x: -1, y: 0 },
			straight: { x: 0, y: -1 },
			right: { x: 1, y: 0 }
		})
		expect(path.junctions[1]?.exits.left).toEqual({ x: 0, y: -1 })
	})

	it('treats an unknown direction as straight on', () => {
		expect(mazePath(['sideways']).cells).toEqual([
			{ x: 0, y: 0 },
			{ x: 0, y: -1 }
		])
	})
})
