import { describe, expect, it } from 'vitest'
import { parseJevAnswers, parseLlmAnswer, stripFences } from './parse'
import { choiceTask, fanOutTask, item } from './testing/tasks'

function jevBody(answers: Record<string, unknown>): string {
	return JSON.stringify({
		model: 'jev-1.13.0',
		answers,
		usage: { input_tokens: 1, output_tokens: 1 }
	})
}
const CHOICE_ANSWER = {
	type: 'choice',
	choice: 'billing',
	probabilities: { billing: 0.88, technical: 0.12, sales: 0 },
	confidence: 0.81
}

describe('parseJevAnswers', () => {
	it('returns the answers map when every question has a matching answer', () => {
		const outcome = parseJevAnswers(
			choiceTask,
			item(choiceTask, 't1'),
			jevBody({ answer: CHOICE_ANSWER })
		)
		expect(outcome.ok).toBe(true)
		expect(outcome.parsed?.answer).toEqual(CHOICE_ANSWER)
	})

	it('fails when an answer is missing or has the wrong type', () => {
		const f1 = item(fanOutTask, 'f1')
		expect(
			parseJevAnswers(fanOutTask, f1, jevBody({ urgent: { type: 'noul', noul: 0.9 } })).ok
		).toBe(false)
		expect(
			parseJevAnswers(
				choiceTask,
				item(choiceTask, 't1'),
				jevBody({ answer: { type: 'noul', noul: 1 } })
			).ok
		).toBe(false)
	})

	it('fails on a body that is not JSON', () => {
		expect(parseJevAnswers(choiceTask, item(choiceTask, 't1'), 'oops')).toEqual({
			ok: false,
			parsed: null
		})
	})
})

describe('stripFences', () => {
	it('removes a json code fence and surrounding space', () => {
		expect(stripFences('```json\n{"answer": true}\n```')).toBe('{"answer": true}')
		expect(stripFences('  {"answer": true} ')).toBe('{"answer": true}')
	})
})

describe('parseLlmAnswer', () => {
	it.each([
		['choice', '{"answer": "billing"}', 'billing'],
		['noul', '{"answer": false}', false],
		['score', '```json\n{"answer": 2}\n```', 2],
		['fan_out', '{"answer": {"a": true, "b": false}}', { a: true, b: false }],
		['find_lines', '{"answer": [2, 4]}', [2, 4]],
		['generate', '{"answer": "Waves fold..."}', 'Waves fold...']
	] as const)('parses a %s answer', (kind, text, expected) => {
		expect(parseLlmAnswer(kind, text)).toEqual({ ok: true, parsed: expected })
	})

	it('keeps generate text exactly as the model wrote it', () => {
		expect(parseLlmAnswer('generate', '{"answer": "  A poem \\n"}')).toEqual({
			ok: true,
			parsed: '  A poem \n'
		})
	})

	it.each([
		['choice', 'billing'],
		['noul', '{"answer": "yes"}'],
		['score', '{"answer": 1.5}'],
		['find_lines', '{"answer": [0]}'],
		['generate', '{"answer": "   "}'],
		['choice', 'Sure! {"answer": "billing"}']
	] as const)('fails a %s reply of %j', (kind, text) => {
		expect(parseLlmAnswer(kind, text)).toEqual({ ok: false, parsed: null })
	})
})
