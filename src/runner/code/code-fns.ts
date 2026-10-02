import { z } from 'zod'
import type { Structured } from '@/content/task-schema'
import { CODE_FN_IDS, type CodeFnId } from '@/lib/constants'
import type { LlmAnswer } from '@/runner/types'
import { compareDateParts, type DateParts } from './dates'

// The Code racer: deterministic functions from an item's state to an answer
// in the LLM format, timed, $0 (DESIGN 3.2). Content-specific functions are
// added in the slice that writes their content.

const sumPairSchema = z.object({ a: z.number().int(), b: z.number().int() })
// Number Crunch Showdown: counting and arithmetic, solved exactly.
const problemSchema = z.discriminatedUnion('op', [
	z.object({ op: z.literal('count_letter'), word: z.string(), letter: z.string().length(1) }),
	z.object({ op: z.literal('count_vowels'), word: z.string() }),
	z.object({ op: z.literal('add'), a: z.number().int(), b: z.number().int() }),
	z.object({ op: z.literal('subtract'), a: z.number().int(), b: z.number().int() }),
	z.object({ op: z.literal('multiply'), a: z.number().int(), b: z.number().int() })
])
const isoDatePairSchema = z.object({ first: z.iso.date(), second: z.iso.date() })

function partsOfIso(iso: string): DateParts {
	const [year, month, day] = iso.split('-').map(Number)
	if (year === undefined || month === undefined || day === undefined) {
		throw new Error(`Not an ISO date: ${iso}`)
	}
	return { year, month, day }
}

export const CODE_FNS: Record<CodeFnId, (state: Structured) => LlmAnswer> = {
	[CODE_FN_IDS.compareDates]: (state) => {
		const { first, second } = isoDatePairSchema.parse(state)
		return compareDateParts(partsOfIso(first), partsOfIso(second))
	},
	// Level 6: the sum as an option key, exact because code added it.
	[CODE_FN_IDS.sumNumbers]: (state) => {
		const { a, b } = sumPairSchema.parse(state)
		return String(a + b)
	},
	[CODE_FN_IDS.solveProblem]: (state) => {
		const problem = problemSchema.parse(state)
		switch (problem.op) {
			case 'count_letter':
				return String(problem.word.toLowerCase().split(problem.letter.toLowerCase()).length - 1)
			case 'count_vowels':
				return String(problem.word.toLowerCase().replace(/[^aeiou]/g, '').length)
			case 'add':
				return String(problem.a + problem.b)
			case 'subtract':
				return String(problem.a - problem.b)
			case 'multiply':
				return String(problem.a * problem.b)
		}
	}
}
