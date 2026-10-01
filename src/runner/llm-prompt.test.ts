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
