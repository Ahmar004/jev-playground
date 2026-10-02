// How race numbers read on screen. Views format runner numbers; they never compute them.

const MS_PER_SECOND = 1000
const PERCENT = 100
const COST_SIGNIFICANT_DIGITS = 3
// recordedAt is an ISO datetime; the date part is what we show.
const DATE_LENGTH = 'YYYY-MM-DD'.length

export const PRICE_UNKNOWN = 'price unknown'
export const NOT_SCORED = 'not scored'

const usd = new Intl.NumberFormat('en-US', {
	style: 'currency',
	currency: 'USD',
	maximumSignificantDigits: COST_SIGNIFICANT_DIGITS
})

export function formatDuration(ms: number): string {
	if (ms < MS_PER_SECOND) return `${Math.round(ms)} ms`
	return `${(ms / MS_PER_SECOND).toFixed(1)} s`
}

export function formatCost(costUsd: number | null): string {
	return costUsd === null ? PRICE_UNKNOWN : usd.format(costUsd)
}

export function formatAccuracy(accuracy: number | null): string {
	return accuracy === null ? NOT_SCORED : `${Math.round(accuracy * PERCENT)}%`
}

/** The local time a live run started, like 14:02 (R13). */
export function runTime(iso: string): string {
	return new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
}

export function recordedOn(iso: string): string {
	return iso.slice(0, DATE_LENGTH)
}
