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

	it("names the nearest level of Jev's in-between Score and keeps the score itself", () => {
		const reviews = game('review-tug-of-war')
		expect(answerLabel(reviews.game.items, reviews.task, 2.2)).toBe('Neutral or mixed (score 2.2)')
		expect(answerLabel(reviews.game.items, reviews.task, 3.76)).toBe('Very positive (score 3.76)')
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

	it('names the yes tags of a fan-out answer, in the order the task asks them', () => {
		const { game: hoops, task } = game('carnival-hoops')
		if (!task) throw new Error('No task')
		const jev = result({
			urgent: { type: 'noul', noul: 0.91 },
			refund: { type: 'noul', noul: 0.88 },
			angry: { type: 'noul', noul: 0.1 },
			needs_human: { type: 'noul', noul: 0.2 }
		})
		expect(answerLabel(hoops.items, task, answerValue(task, 'jev', jev))).toBe('Urgent, Refund')
		expect(jevNote(task, 'jev', jev)).toBe(
			'chance of yes: Urgent 91%, Refund 88%, Angry 10%, Needs human 20%'
		)
		const none = { urgent: false, refund: false, angry: false, needs_human: false }
		expect(answerLabel(hoops.items, task, answerValue(task, 'llm', result(none)))).toBe('No tags')
		expect(answerValue(task, 'llm', result(null, false))).toBeNull()
	})

	it("reads Jev + Code's combined answer and says how many days Code counted", () => {
		const { game: defense, task } = game('date-defense')
		if (!task) throw new Error('No task')
		const combined = result({ answer: false, detail: { days: 37 } })
		expect(answerLabel(defense.items, task, answerValue(task, 'jev_code', combined))).toBe(
			'Too late'
		)
		expect(jevNote(task, 'jev_code', combined)).toBe('Code counted 37 days')
	})
})
