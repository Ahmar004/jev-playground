'use client'

import { m } from 'motion/react'
import { cn } from '@/lib/cn'
import type { Mode, Racer } from '@/lib/constants'
import { formatCost, formatDuration } from './format'
import { ModeLabel } from './mode-label'
import { racerName } from './racer-names'
import { RACER_STYLE } from './racer-style'
import { RacerTag } from './racer-tag'
import { racerTimeMs, type RacerState } from './race-state'

export type RaceTrackData = {
	racer: Racer
	modelId: string
	// The recording date, or the start of a live run (Developer mode).
	recordedAt: string
	mode?: Mode
	state: RacerState
}

const PERCENT = 100
const STAT_LABEL = 'text-text-muted text-xs'
const STAT_VALUE = 'text-text text-lg font-bold tabular-nums'

/** One racer's lane: items done, busy lanes, time and cost so far. Numbers come from the runner. */
export function RaceTrack({
	track,
	elapsedMs,
	lanes
}: {
	track: RaceTrackData
	elapsedMs: number
	lanes: number
}) {
	const { racer, modelId, recordedAt, mode, state } = track
	const done = state.results.length
	const totals = state.totals ?? state.progress
	const name = racerName(racer, modelId)
	const { fill, edge } = RACER_STYLE[racer]

	return (
		<div
			className={cn(
				'bg-surface border-border shadow-card flex flex-col gap-3 rounded-lg border border-t-4 p-4',
				edge
			)}
		>
			<div className="flex flex-wrap items-baseline justify-between gap-2">
				<RacerTag racer={racer} modelId={modelId} />
				<ModeLabel modelId={modelId} recordedAt={recordedAt} mode={mode} />
			</div>
			<div
				role="progressbar"
				aria-label={`${name} items done`}
				aria-valuemin={0}
				aria-valuemax={state.itemsTotal}
				aria-valuenow={done}
				aria-valuetext={`${done} of ${state.itemsTotal} items`}
				className="bg-surface-hover h-3 overflow-hidden rounded-full"
			>
				<m.div
					className={cn('h-full rounded-full', fill)}
					initial={false}
					animate={{ width: `${(done / Math.max(1, state.itemsTotal)) * PERCENT}%` }}
				/>
			</div>
			<div
				className="flex items-center gap-2"
				aria-label={`${state.inFlight} of ${lanes} lanes busy`}
				role="img"
			>
				<span className={STAT_LABEL}>Lanes</span>
				{Array.from({ length: lanes }, (_, lane) => (
					<span
						key={lane}
						className={cn(
							'border-border-strong size-3 rounded-full border transition-colors duration-300',
							lane < state.inFlight && cn(fill, 'animate-pulse')
						)}
					/>
				))}
			</div>
			<dl className="grid grid-cols-3 gap-2">
				<div>
					<dt className={STAT_LABEL}>Done</dt>
					<dd className={STAT_VALUE}>
						{done}/{state.itemsTotal}
					</dd>
				</div>
				<div>
					<dt className={STAT_LABEL}>Time</dt>
					<dd className={STAT_VALUE}>{formatDuration(racerTimeMs(state, elapsedMs))}</dd>
				</div>
				<div>
					<dt className={STAT_LABEL}>Cost</dt>
					<dd className={STAT_VALUE}>{formatCost(totals.costUsd)}</dd>
				</div>
			</dl>
		</div>
	)
}
