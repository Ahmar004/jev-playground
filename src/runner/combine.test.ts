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
