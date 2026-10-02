import { describe, expect, it } from 'vitest'
import { QUESTION_KINDS } from '@/lib/constants'
import {
	bodyToDoc,
	buildSandboxTask,
	docToBody,
	optionsText,
	serializeBody,
	structuredOf,
	withKind,
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
})
