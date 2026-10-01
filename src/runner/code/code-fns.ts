import { z } from 'zod'
import type { Structured } from '@/content/task-schema'
import { CODE_FN_IDS, type CodeFnId } from '@/lib/constants'
import type { LlmAnswer } from '@/runner/types'
import { compareDateParts, type DateParts } from './dates'

// The Code racer: deterministic functions from an item's state to an answer
// in the LLM format, timed, $0 (DESIGN 3.2). Content-specific functions are
// added in the slice that writes their content.

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
	}
}
