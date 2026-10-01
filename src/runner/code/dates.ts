import { DATE_ORDER, type DateOrder } from '@/lib/constants'

export type DateParts = { year: number; month: number; day: number }

const MONTH_OFFSET = 1 // Date.UTC months start at 0

function toTime({ year, month, day }: DateParts): number {
	const time = Date.UTC(year, month - MONTH_OFFSET, day)
	const date = new Date(time)
	if (
		date.getUTCFullYear() !== year ||
		date.getUTCMonth() !== month - MONTH_OFFSET ||
		date.getUTCDate() !== day
	) {
		throw new Error(`Not a calendar date: ${year}-${month}-${day}`)
	}
	return time
}

/** Which of two calendar dates comes first. Throws on a date that doesn't exist. */
export function compareDateParts(first: DateParts, second: DateParts): DateOrder {
	const a = toTime(first)
	const b = toTime(second)
	if (a === b) return DATE_ORDER.same
	return a < b ? DATE_ORDER.first : DATE_ORDER.second
}
