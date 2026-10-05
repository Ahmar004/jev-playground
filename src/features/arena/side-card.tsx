import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { itemOutcome } from '@/features/race/answer-text'
import { formatCost, formatDuration, NOT_SCORED } from '@/features/race/format'
import { ModeLabel } from '@/features/race/mode-label'
import { RacerTag } from '@/features/race/racer-tag'
import { ITEM_OUTCOMES, type ItemOutcome, type Mode, type Racer } from '@/lib/constants'
import { AnswerView } from './answer-view'
import type { ArenaSide } from './snapshot'
import { ScrollRegion } from '@/components/ui/scroll-region'

const OUTCOME_BADGE: Record<
	ItemOutcome,
	{ label: string; variant: 'success' | 'danger' | 'warning' | 'secondary' }
> = {
	[ITEM_OUTCOMES.right]: { label: 'Right', variant: 'success' },
	[ITEM_OUTCOMES.wrong]: { label: 'Wrong', variant: 'danger' },
	[ITEM_OUTCOMES.unparsed]: { label: "Couldn't parse", variant: 'warning' },
	[ITEM_OUTCOMES.failed]: { label: 'Call failed', variant: 'warning' },
	[ITEM_OUTCOMES.unscored]: { label: NOT_SCORED, variant: 'secondary' }
}

/** Where a racer's result is while a run is under way: waiting for it, with the racer named. */
export function PendingCard({ racer, modelId }: { racer: Racer; modelId: string }) {
	return (
		<Card className="flex min-h-48 flex-col gap-3 p-4" role="status" aria-busy="true">
			<RacerTag racer={racer} modelId={modelId} />
			<p className="text-text-muted animate-pulse text-sm motion-reduce:animate-none">
				Working on it...
			</p>
		</Card>
	)
}

/**
 * One racer's result on the Arena's item: its answer with probabilities and
 * confidence, latency, cost and the mode label (R43, R84). A reply that can't
 * be parsed shows its raw text with a note, never hidden (R44).
 */
export function SideCard({ side, mode }: { side: ArenaSide; mode: Mode }) {
	const { racer, modelId, at, result } = side
	const outcome = itemOutcome(result)
	const badge = OUTCOME_BADGE[outcome]
	return (
		<Card className="flex flex-col gap-3 p-4">
			<div className="flex flex-wrap items-center justify-between gap-2">
				<RacerTag racer={racer} modelId={modelId} />
				<Badge variant={badge.variant}>{badge.label}</Badge>
			</div>
			{result.ok ? (
				<AnswerView racer={racer} result={result} />
			) : (
				<div className="flex flex-col gap-2">
					<p className="text-text text-sm">
						{result.error
							? `The call failed (${result.error}), so there is no answer.`
							: "The reply couldn't be parsed into the expected format, so it counts as a miss. This is what came back:"}
					</p>
					<ScrollRegion
						label="Raw reply"
						className="bg-surface-hover max-h-48 overflow-auto rounded"
					>
						<pre className="text-text p-2 text-xs wrap-anywhere whitespace-pre-wrap">
							{result.raw || '(empty)'}
						</pre>
					</ScrollRegion>
				</div>
			)}
			<dl className="text-text-muted grid grid-cols-3 gap-2 text-sm">
				<div>
					<dt className="text-xs">Latency</dt>
					<dd className="text-text tabular-nums">{formatDuration(result.latencyMs)}</dd>
				</div>
				<div>
					<dt className="text-xs">Cost</dt>
					<dd className="text-text">{formatCost(result.costUsd)}</dd>
				</div>
				<div>
					<dt className="text-xs">Tokens</dt>
					<dd className="text-text tabular-nums">
						{result.usage.inputTokens} in, {result.usage.outputTokens} out
					</dd>
				</div>
			</dl>
			<ModeLabel modelId={modelId} recordedAt={at} mode={mode} />
		</Card>
	)
}
