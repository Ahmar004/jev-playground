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
		expect(lineNumberFromKey('line_1e1')).toBeNull()
		expect(lineNumberFromKey('line_0x1')).toBeNull()
		expect(lineNumberFromKey('line_0')).toBeNull()
	})
})
