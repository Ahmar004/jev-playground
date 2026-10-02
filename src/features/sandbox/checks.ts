import { QUESTION_KINDS } from '@/lib/constants'
import { textOf, type SandboxDoc } from './doc'

// Jev's limits from docs.typesafe.ai/api (spec 9, R53). Sizes are estimates
// (characters / 4), so every message says so.
const CHARS_PER_TOKEN = 4
const MAX_STATE_AND_QUESTION_TOKENS = 32_000
const MAX_TOTAL_TOKENS = 64_000
const MAX_CHOICE_OPTIONS = 255
const MIN_CHOICE_OPTIONS = 2
const MIN_SCORE_LEVELS = 2
const MAX_SCORE_LEVELS = 10
// A long state is allowed, but Jev handles a short one best (R52).
const LONG_STATE_TOKENS = 8_000

function tokens(text: string): number {
	return Math.ceil(text.length / CHARS_PER_TOKEN)
}

function stateTokens(doc: SandboxDoc): number {
	return tokens(doc.state === '' ? '' : (JSON.stringify(doc.state) ?? ''))
}

function questionTokens(question: SandboxDoc['questions'][number]): number {
	return tokens(JSON.stringify(question.question))
}

/** What stops a send: each message says what to change. An empty list means the setup fits Jev's limits (R53). */
export function limitProblems(doc: SandboxDoc): string[] {
	const problems: string[] = []
	const state = stateTokens(doc)
	const sizes = doc.questions.map(questionTokens)
	const longest = Math.max(0, ...sizes)
	if (state + longest > MAX_STATE_AND_QUESTION_TOKENS) {
		problems.push(
			`The state plus the longest question is about ${state + longest} tokens (an estimate). Jev accepts at most ${MAX_STATE_AND_QUESTION_TOKENS}. Shorten the state or that question.`
		)
	}
	const total = state + sizes.reduce((sum, size) => sum + size, 0)
	if (total > MAX_TOTAL_TOKENS) {
		problems.push(
			`The whole request is about ${total} tokens (an estimate). Jev accepts at most ${MAX_TOTAL_TOKENS}. Remove a question or shorten the state.`
		)
	}
	for (const { name, question } of doc.questions) {
		if (question.type === QUESTION_KINDS.choice) {
			const count = Object.keys(question.criteria).length
			if (count > MAX_CHOICE_OPTIONS) {
				problems.push(
					`"${name}" has ${count} options. A Choice allows at most ${MAX_CHOICE_OPTIONS}.`
				)
			} else if (count < MIN_CHOICE_OPTIONS) {
				problems.push(`"${name}" needs at least ${MIN_CHOICE_OPTIONS} different options.`)
			}
		}
		if (question.type === QUESTION_KINDS.score) {
			const count = question.criteria.length
			if (count < MIN_SCORE_LEVELS || count > MAX_SCORE_LEVELS) {
				problems.push(
					`"${name}" has ${count} levels. A Score needs ${MIN_SCORE_LEVELS} to ${MAX_SCORE_LEVELS}.`
				)
			}
		}
	}
	return problems
}

export type Warning = { id: string; message: string }

const COUNTING = /\b(count|how many|number of|total number)\b/i
const MATH =
	/\b(sum|add up|subtract|multiply|divide|calculate|average|percent(age)?)\b|\d\s*[-+*/x]\s*\d/i
const DATES =
	/\b(dates?|weekday|day of the week|days? (until|between|since|ago|left)|earlier|later|before|after|deadline|month|year)\b/i
const GENERATING = /\b(write|generate|compose|draft|rewrite|translate|summari[sz]e|describe)\b/i

const RULES: { id: string; pattern: RegExp; message: string }[] = [
	{
		id: 'counting',
		pattern: COUNTING,
		message:
			'Counting is a known weak spot for Jev. Use code to count, or check the answer yourself.'
	},
	{
		id: 'math',
		pattern: MATH,
		message: 'Arithmetic is a known weak spot for Jev. Plain code does math exactly.'
	},
	{
		id: 'dates',
		pattern: DATES,
		message: 'Dates and durations are a known weak spot for Jev. Plain code compares dates exactly.'
	},
	{
		id: 'generating',
		pattern: GENERATING,
		message:
			'Jev answers questions; it cannot write or rewrite text. A frontier LLM is the tool for that.'
	}
]

/** Simple rules on the question text and the input size, matching Jev's known weaknesses (R52). Never blocks a send. */
export function weaknessWarnings(doc: SandboxDoc): Warning[] {
	const warnings: Warning[] = []
	for (const { name, question } of doc.questions) {
		const text = `${name.replaceAll('_', ' ')} ${textOf(question.instructions)}`
		for (const rule of RULES) {
			if (rule.pattern.test(text)) {
				warnings.push({ id: `${name}-${rule.id}`, message: `"${name}": ${rule.message}` })
			}
		}
	}
	if (stateTokens(doc) > LONG_STATE_TOKENS) {
		warnings.push({
			id: 'long-state',
			message:
				'The state is long (an estimate of over 8,000 tokens). Jev is most reliable on short inputs.'
		})
	}
	return warnings
}
