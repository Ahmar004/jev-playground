'use client'

import { useId } from 'react'
import { Card } from '@/components/ui/card'
import type { Recording } from '@/content/recording-schema'
import { jevChoicePoints, splitByThreshold } from '@/runner/threshold'

const PERCENT = 100

/**
 * Confidence Catch's slider: re-sorts Jev's recorded answers by confidence, here and in the scene
 * above (the threshold is held by the game). It runs nothing new, so it is an honest view of the recording.
 */
export function ThresholdPanel({
	jev,
	threshold,
	onThresholdChange
}: {
	jev: Recording
	threshold: number
	onThresholdChange: (threshold: number) => void
}) {
	const sliderId = useId()
	const points = jevChoicePoints(jev)
	const split = splitByThreshold(points, threshold)
	const rows = [
		{ label: 'Acted on, right', count: split.actedRight, tone: 'text-success' },
		{ label: 'Acted on, wrong', count: split.actedWrong, tone: 'text-danger' },
		{ label: 'Sent to a person', count: split.review, tone: 'text-text' }
	]
	return (
		<Card role="region" aria-labelledby="threshold-heading" className="flex flex-col gap-4 p-5">
			<h2 id="threshold-heading" className="text-text text-2xl font-bold">
				Set the confidence threshold
			</h2>
			<p className="text-text-muted">
				The recorded Jev answers fall into three bins. Answers at or above the threshold are acted
				on by the machine, and the rest go to a person.
			</p>
			<div className="flex flex-col gap-2">
				<label htmlFor={sliderId} className="text-text font-semibold">
					Threshold: {Math.round(threshold * PERCENT)}%
				</label>
				<input
					id={sliderId}
					type="range"
					min={0}
					max={PERCENT}
					step={1}
					value={Math.round(threshold * PERCENT)}
					onChange={(event) => onThresholdChange(Number(event.target.value) / PERCENT)}
					className="accent-accent w-full"
				/>
			</div>
			<dl className="grid grid-cols-1 gap-3 sm:grid-cols-3">
				{rows.map((row) => (
					<div
						key={row.label}
						className="bg-surface border-border shadow-card rounded-lg border p-3"
					>
						<dt className="text-text-muted text-sm">{row.label}</dt>
						<dd className={`text-3xl font-extrabold tabular-nums ${row.tone}`}>
							{row.count}
							<span className="text-text-muted text-sm font-medium"> of {points.length}</span>
						</dd>
					</div>
				))}
			</dl>
		</Card>
	)
}
