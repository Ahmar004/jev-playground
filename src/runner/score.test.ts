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
