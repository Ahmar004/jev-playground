import { describe, expect, it } from 'vitest'
import { jevRecording, opusRecording } from './testing/recordings'
import { answerText, itemOutcome, valueText } from './answer-text'

const [jevT1, , jevT3] = jevRecording.events
const [opusT1, opusT2, opusT3] = opusRecording.events
if (!jevT1 || !jevT3 || !opusT1 || !opusT2 || !opusT3) throw new Error('fixture events missing')

describe('answerText', () => {
	it("reads Jev's choice and the LLM's answer as plain text", () => {
		expect(answerText('jev', jevT1)).toBe('billing')
		expect(answerText('llm', opusT1)).toBe('billing')
	})

	it("reads Jev + Code's combined answer, not the wrapper", () => {
		expect(answerText('jev_code', { ...jevT1, parsed: { answer: '3' } })).toBe('3')
	})

	it('has no answer when the output did not parse', () => {
		expect(answerText('llm', opusT2)).toBeNull()
	})
})

describe('itemOutcome', () => {
	it('separates right, wrong, unparsed, failed and unscored', () => {
		expect(itemOutcome(jevT1)).toBe('right')
		expect(itemOutcome({ ...jevT1, credit: 0, correct: false })).toBe('wrong')
		expect(itemOutcome(opusT2)).toBe('unparsed')
		expect(itemOutcome({ ...opusT2, error: 'rate_limited' })).toBe('failed')
		expect(itemOutcome(opusT3)).toBe('unscored')
	})
})

describe('valueText', () => {
	it('writes labels as plain text', () => {
		expect(valueText('billing')).toBe('billing')
		expect(valueText(true)).toBe('yes')
		expect(valueText(2)).toBe('2')
		expect(valueText([1, 3])).toBe('[1,3]')
	})

	it('always returns a string, even for undefined', () => {
		expect(valueText(undefined)).toBe('undefined')
	})
})
