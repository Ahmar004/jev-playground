import { describe, expect, it } from 'vitest'
import { QUESTION_KINDS } from '@/lib/constants'
import {
	bodyToDoc,
	buildSandboxTask,
	docToBody,
	optionDescriptionText,
	optionsText,
	criterionText,
	serializeBody,
	structuredOf,
	withCriterion,
	withKind,
	withOptionDescription,
	withOptions,
	type SandboxDoc,
	type SandboxQuestion
} from './doc'

const TOPIC: SandboxQuestion = {
	id: 'a',
	name: 'topic',
	question: {
		type: QUESTION_KINDS.choice,
		instructions: 'Main complaint?',
		criteria: { food: null, speed: null }
	}
}
const HAPPY: SandboxQuestion = {
	id: 'b',
	name: 'happy',
	question: { type: QUESTION_KINDS.noul, instructions: 'Happy?' }
}
const DOC: SandboxDoc = { state: 'The pasta was lovely but slow.', questions: [TOPIC, HAPPY] }

describe('sandbox doc', () => {
	it('round trips through the JSON view without changing', () => {
		const parsed = bodyToDoc(serializeBody(DOC))
		expect(parsed.ok).toBe(true)
		if (parsed.ok) expect(docToBody(parsed.doc)).toEqual(docToBody(DOC))
	})

	it('explains invalid JSON and a wrong shape in plain words', () => {
		expect(bodyToDoc('{').ok).toBe(false)
		const shape = bodyToDoc('{"state":"x","questions":{"q":{"type":"essay","instructions":"?"}}}')
		expect(shape.ok).toBe(false)
	})

	it('treats typed JSON as a structured state and everything else as text', () => {
		expect(structuredOf('{"a":1}')).toEqual({ a: 1 })
		expect(structuredOf('{"a":')).toBe('{"a":')
		expect(structuredOf('plain')).toBe('plain')
	})

	it('edits options as lines and keeps the descriptions of options that stay', () => {
		const question = {
			type: QUESTION_KINDS.choice,
			instructions: 'q',
			criteria: { food: 'the meal', speed: null }
		} as const
		const next = withOptions(question, 'food\nprice\n\n')
		expect(next).toEqual({
			type: QUESTION_KINDS.choice,
			instructions: 'q',
			criteria: { food: 'the meal', price: null }
		})
		expect(optionsText(next)).toBe('food\nprice')
	})

	it('keeps the instructions when the kind changes', () => {
		expect(withKind(HAPPY.question, QUESTION_KINDS.score)).toEqual({
			type: QUESTION_KINDS.score,
			instructions: 'Happy?',
			criteria: []
		})
	})

	it('builds a Task from a valid setup and says what to fix otherwise', () => {
		expect(buildSandboxTask(DOC).ok).toBe(true)
		expect(buildSandboxTask({ ...DOC, state: '' })).toEqual({
			ok: false,
			error: 'Write the state Jev should look at.'
		})
		const dup = { ...DOC, questions: [TOPIC, { ...HAPPY, name: 'topic' }] }
		expect(buildSandboxTask(dup)).toEqual({ ok: false, error: 'Each question needs its own name.' })
		const oneOption = {
			...DOC,
			questions: [{ ...TOPIC, question: withOptions(TOPIC.question, 'food') }]
		}
		expect(buildSandboxTask(oneOption).ok).toBe(false)
	})

	it('sets a Noul criterion for one answer and leaves the other out', () => {
		const withTrue = withCriterion(HAPPY.question, 'true', 'Yes only if they praise it')
		expect(withTrue).toEqual({
			type: QUESTION_KINDS.noul,
			instructions: 'Happy?',
			criteria: { true: 'Yes only if they praise it' }
		})
		expect(criterionText(withTrue, 'true')).toBe('Yes only if they praise it')
		expect(criterionText(withTrue, 'false')).toBe('')
		const both = withCriterion(withTrue, 'false', '{"anything":"else"}')
		expect(both).toMatchObject({
			criteria: { true: expect.any(String), false: { anything: 'else' } }
		})
	})

	it('drops a cleared Noul criterion, and the whole criteria when none is left', () => {
		const set = withCriterion(HAPPY.question, 'true', 'x')
		expect(withCriterion(set, 'true', '  ')).toEqual(HAPPY.question)
		expect('criteria' in withCriterion(set, 'true', '')).toBe(false)
		const both = withCriterion(withCriterion(set, 'false', 'y'), 'true', '')
		expect(both).toMatchObject({ criteria: { false: 'y' } })
	})

	it('sets a Choice option description, and null means none', () => {
		const next = withOptionDescription(TOPIC.question, 'food', 'Anything about the meal')
		expect(next).toMatchObject({ criteria: { food: 'Anything about the meal', speed: null } })
		expect(optionDescriptionText(next, 'food')).toBe('Anything about the meal')
		expect(optionDescriptionText(next, 'speed')).toBe('')
		expect(withOptionDescription(next, 'food', ' ')).toEqual(TOPIC.question)
	})

	it('keeps criteria through the JSON view and the build', () => {
		const rich: SandboxDoc = {
			state: 'x',
			questions: [
				{ ...HAPPY, question: withCriterion(HAPPY.question, 'false', 'Not praise') },
				{ ...TOPIC, question: withOptionDescription(TOPIC.question, 'speed', 'Waiting time') }
			]
		}
		const parsed = bodyToDoc(serializeBody(rich))
		expect(parsed.ok && docToBody(parsed.doc)).toEqual(docToBody(rich))
		expect(buildSandboxTask(rich).ok).toBe(true)
	})
})
