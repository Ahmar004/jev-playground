import { describe, expect, it } from 'vitest'
import { QUESTION_KINDS } from '@/lib/constants'
import { limitProblems, weaknessWarnings } from './checks'
import { withOptions, type SandboxDoc, type SandboxQuestion } from './doc'

function noul(name: string, instructions: string): SandboxQuestion {
	return { id: name, name, question: { type: QUESTION_KINDS.noul, instructions } }
}

function docOf(state: string, ...questions: SandboxQuestion[]): SandboxDoc {
	return { state, questions }
}

describe('limitProblems', () => {
	it('passes a small setup', () => {
		expect(limitProblems(docOf('short', noul('q', 'Is it?')))).toEqual([])
	})

	it('blocks a state plus longest question over 32k tokens', () => {
		const problems = limitProblems(docOf('x'.repeat(130_000), noul('q', 'Is it?')))
		expect(problems[0]).toContain('state plus the longest question')
		expect(problems[0]).toContain('estimate')
	})

	it('blocks a request over 64k tokens in total', () => {
		const questions = Array.from({ length: 5 }, (_, index) =>
			noul(`q${index}`, 'y'.repeat(100_000))
		)
		const problems = limitProblems(docOf('x', ...questions))
		expect(problems.some((problem) => problem.includes('whole request'))).toBe(true)
	})

	it('blocks a Choice outside 2 to 255 options and a Score outside 2 to 10 levels', () => {
		const choice = (count: number): SandboxQuestion => ({
			id: 'c',
			name: 'c',
			question: withOptions(
				{ type: QUESTION_KINDS.choice, instructions: 'pick', criteria: {} },
				Array.from({ length: count }, (_, index) => `o${index}`).join('\n')
			)
		})
		expect(limitProblems(docOf('s', choice(256)))[0]).toContain('at most 255')
		expect(limitProblems(docOf('s', choice(1)))[0]).toContain('at least 2')
		expect(limitProblems(docOf('s', choice(255)))).toEqual([])
		const score = (count: number): SandboxQuestion => ({
			id: 's',
			name: 's',
			question: withOptions(
				{ type: QUESTION_KINDS.score, instructions: 'rate', criteria: [] },
				Array.from({ length: count }, (_, index) => `l${index}`).join('\n')
			)
		})
		expect(limitProblems(docOf('s', score(11)))[0]).toContain('2 to 10')
		expect(limitProblems(docOf('s', score(1)))[0]).toContain('2 to 10')
		expect(limitProblems(docOf('s', score(10)))).toEqual([])
	})
})

describe('weaknessWarnings', () => {
	it('warns on counting, math, dates and text generation', () => {
		const ids = (text: string) =>
			weaknessWarnings(docOf('s', noul('q', text))).map((warning) => warning.id)
		expect(ids('How many apples are there?')).toContain('q-counting')
		expect(ids('What is 12 + 7?')).toContain('q-math')
		expect(ids('Which date is earlier?')).toContain('q-dates')
		expect(ids('Write a reply to the customer.')).toContain('q-generating')
	})

	it('stays quiet for a question Jev is good at', () => {
		expect(weaknessWarnings(docOf('s', noul('q', 'Is the customer angry?')))).toEqual([])
	})

	it('warns on a long state', () => {
		const warnings = weaknessWarnings(docOf('x'.repeat(40_000), noul('q', 'Is it fine?')))
		expect(warnings.map((warning) => warning.id)).toContain('long-state')
	})
})
