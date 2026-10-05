import { describe, expect, it } from 'vitest'
import { GAMES } from '@/content/games'
import { getTask } from '@/content/tasks'
import type { ItemResult } from '@/runner/types'
import { answerLabel, answerValue, jevNote, stateParts } from './item-view'

function game(id: string) {
	const found = GAMES.get(id)
	if (!found) throw new Error(`No game ${id}`)
	return { game: found, task: getTask(found.taskId) }
}

function result(parsed: unknown, ok = true): ItemResult {
	return {
		itemId: 'x',
		ok,
		raw: 'raw',
		parsed,
		credit: 0,
		correct: false,
		latencyMs: 1,
		usage: { inputTokens: 1, outputTokens: 1 },
		costUsd: 0
	}
}

describe('stateParts', () => {
	it('shows a message as is, a problem by its wording and an object by its named fields', () => {
		expect(stateParts('Hello')).toEqual([{ name: null, text: 'Hello' }])
		expect(stateParts({ problem: 'What is 2 + 2?', op: 'sum' })).toEqual([
			{ name: null, text: 'What is 2 + 2?' }
		])
		expect(stateParts({ shopA: 'Phone', shopB: 'Phone case' })).toEqual([
			{ name: 'Shop A', text: 'Phone' },
			{ name: 'Shop B', text: 'Phone case' }
		])
	})

	it('numbers the lines of a document from 1', () => {
		expect(stateParts(['First', 'Second'])).toEqual([
			{ name: '1', text: 'First' },
			{ name: '2', text: 'Second' }
		])
	})
})

describe('answerLabel', () => {
	it("uses the game's own words for each kind of answer", () => {
		const citation = game('citation-cop')
		expect(answerLabel(citation.game.items, citation.task, false)).toBe('Not supported')
		const gate = game('guardrail-gauntlet')
		expect(answerLabel(gate.game.items, gate.task, 'block')).toBe('Block')
		const reviews = game('review-tug-of-war')
		expect(answerLabel(reviews.game.items, reviews.task, 0)).toBe('Very negative')
		const needle = game('needle-hunt')
		expect(answerLabel(needle.game.items, needle.task, [10, 5])).toBe('Lines 5 and 10')
		expect(answerLabel(needle.game.items, needle.task, [])).toBe('No lines')
	})
})

describe('answerValue and jevNote', () => {
	it("reads Jev's Noul against the scoring bar and states its probability", () => {
		const { task } = game('citation-cop')
		const jev = result({ answer: { type: 'noul', noul: 0.2 } })
		expect(answerValue(task, 'jev', jev)).toBe(false)
		expect(jevNote(task, 'jev', jev)).toBe('20% likely yes')
	})

	it("gives Jev's confidence on a Choice, nothing for the LLM, and null for an unparsed answer", () => {
		const { task } = game('confidence-catch')
		const jev = result({
			answer: { type: 'choice', choice: 'billing', probabilities: {}, confidence: 0.87 }
		})
		expect(answerValue(task, 'jev', jev)).toBe('billing')
		expect(jevNote(task, 'jev', jev)).toBe('87% sure')
		expect(jevNote(task, 'llm', result('billing'))).toBeNull()
		expect(answerValue(task, 'llm', result(null, false))).toBeNull()
	})
})
