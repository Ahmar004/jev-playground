import type { PredictedRacer } from '@/content/level-schema'
import {
	PREDICTION_METRICS,
	PREDICTION_OUTCOMES,
	type PredictionMetric,
	type PredictionOutcome
} from '@/lib/constants'
import type { RunTotals } from '@/runner/types'

export type Prediction = Partial<Record<PredictionMetric, PredictedRacer>>
export type Contender = { racer: PredictedRacer; totals: RunTotals }
export type Verdict = {
	metric: PredictionMetric
	predicted: PredictedRacer | null
	// Every racer with the best number; null when a number is missing.
	winners: PredictedRacer[] | null
	outcome: PredictionOutcome
}

// The runner's number each prediction reads, and whether lower wins.
const METRIC_RULES: Record<
	PredictionMetric,
	{ value: (totals: RunTotals) => number | null; lowerWins: boolean }
> = {
	[PREDICTION_METRICS.fastest]: { value: (totals) => totals.wallMs, lowerWins: true },
	[PREDICTION_METRICS.cheapest]: { value: (totals) => totals.costUsd, lowerWins: true },
	[PREDICTION_METRICS.mostAccurate]: { value: (totals) => totals.accuracy, lowerWins: false }
}

function winnersFor(metric: PredictionMetric, contenders: Contender[]): PredictedRacer[] | null {
	const rule = METRIC_RULES[metric]
	const values: { racer: PredictedRacer; value: number }[] = []
	for (const contender of contenders) {
		const value = rule.value(contender.totals)
		if (value === null) return null
		values.push({ racer: contender.racer, value })
	}
	if (values.length === 0) return null
	const numbers = values.map((entry) => entry.value)
	const best = rule.lowerWins ? Math.min(...numbers) : Math.max(...numbers)
	return values.filter((entry) => entry.value === best).map((entry) => entry.racer)
}

/** Compares one prediction with the recorded numbers (R25). It reads the runner's totals; it never computes them. */
export function judgePrediction(
	metric: PredictionMetric,
	predicted: PredictedRacer | undefined,
	contenders: Contender[]
): Verdict {
	const winners = winnersFor(metric, contenders)
	const base = { metric, predicted: predicted ?? null, winners }
	if (!predicted) return { ...base, outcome: PREDICTION_OUTCOMES.skipped }
	if (!winners) return { ...base, outcome: PREDICTION_OUTCOMES.unknown }
	if (winners.length > 1) return { ...base, outcome: PREDICTION_OUTCOMES.tie }
	return {
		...base,
		outcome: winners[0] === predicted ? PREDICTION_OUTCOMES.right : PREDICTION_OUTCOMES.wrong
	}
}
