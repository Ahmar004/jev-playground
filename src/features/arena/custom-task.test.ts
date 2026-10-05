import { describe, expect, it } from 'vitest'
import { taskSchema, type Task } from '@/content/task-schema'
import { QUESTION_KINDS } from '@/lib/constants'
import { buildCustomTask, withEditedState } from './custom-task'

const base = { state: 'The soup was cold.', question: 'Is this a complaint?', options: '' }

describe('buildCustomTask', () => {
	it('builds a Noul task whose item has no stored answer', () => {
		const built = buildCustomTask({ ...base, kind: QUESTION_KINDS.noul })
		expect(built.ok).toBe(true)
		if (!built.ok) return
		expect(taskSchema.safeParse(built.task).success).toBe(true)
		expect(built.task.items[0]?.label).toBeUndefined()
	})

	it('builds a Choice from one option per line', () => {
		const built = buildCustomTask({
			...base,
			kind: QUESTION_KINDS.choice,
			options: 'food\n\n service \n'
		})
		expect(built.ok && built.task.jev).toEqual({
			questions: {
				answer: {
					type: 'choice',
					instructions: 'Is this a complaint?',
					criteria: { food: null, service: null }
				}
			}
		})
	})

	it('rejects a Choice with one option, repeated options, or a Score outside 2 to 10 levels', () => {
		expect(buildCustomTask({ ...base, kind: QUESTION_KINDS.choice, options: 'only' }).ok).toBe(
			false
		)
		expect(buildCustomTask({ ...base, kind: QUESTION_KINDS.choice, options: 'a\na' })).toEqual({
			ok: false,
			error: 'Each option must be different.'
		})
		expect(buildCustomTask({ ...base, kind: QUESTION_KINDS.score, options: 'low' }).ok).toBe(false)
		const eleven = Array.from({ length: 11 }, (_, i) => `level ${i}`).join('\n')
		expect(buildCustomTask({ ...base, kind: QUESTION_KINDS.score, options: eleven }).ok).toBe(false)
	})

	it('asks for the missing text or question', () => {
		expect(buildCustomTask({ ...base, kind: QUESTION_KINDS.noul, state: '  ' })).toEqual({
			ok: false,
			error: 'Write the text Jev should look at.'
		})
		expect(buildCustomTask({ ...base, kind: QUESTION_KINDS.noul, question: '' })).toEqual({
			ok: false,
			error: 'Write the question to answer.'
		})
	})

	it('refuses text longer than a share can hold', () => {
		const built = buildCustomTask({ ...base, kind: QUESTION_KINDS.noul, state: 'x'.repeat(8001) })
		expect(built.ok).toBe(false)
	})
})

const textTask: Task = taskSchema.parse({
	id: 'preset',
	kind: 'noul',
	version: 1,
	jev: { questions: { answer: { type: 'noul', instructions: 'Q?' } } },
	items: [{ id: 'i1', state: 'original', label: true }]
})
const jsonTask: Task = taskSchema.parse({
	id: 'preset-json',
	kind: 'noul',
	version: 1,
	jev: { questions: { answer: { type: 'noul', instructions: 'Q?' } } },
	items: [{ id: 'i1', state: { a: 'x', b: 'y' }, label: false }]
})

describe('withEditedState', () => {
	it('uses the edited text and drops the stored answer, so the run is not scored', () => {
		const built = withEditedState(textTask, '  changed  ')
		expect(built.ok && built.task.items[0]).toEqual({ id: 'i1', state: 'changed' })
	})

	it('keeps the stored answer while the input is still the preset own, so the run is scored', () => {
		const text = withEditedState(textTask, '  original\n')
		expect(text.ok && text.task.items[0]).toEqual({ id: 'i1', state: 'original', label: true })
		const json = withEditedState(jsonTask, JSON.stringify({ a: 'x', b: 'y' }, null, 2))
		expect(json.ok && json.task.items[0]?.label).toBe(false)
	})

	it('parses an object state as JSON', () => {
		const built = withEditedState(jsonTask, '{"a":"1","b":"2"}')
		expect(built.ok && built.task.items[0]?.state).toEqual({ a: '1', b: '2' })
	})

	it('explains broken JSON and empty input', () => {
		expect(withEditedState(jsonTask, '{"a":')).toEqual({
			ok: false,
			error: 'This input is JSON. Check for a missing quote or comma.'
		})
		expect(withEditedState(textTask, ' ').ok).toBe(false)
	})
})
