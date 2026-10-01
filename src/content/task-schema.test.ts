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
