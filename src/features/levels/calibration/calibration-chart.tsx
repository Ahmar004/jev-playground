import type { Recording } from '@/content/recording-schema'
import type { Task } from '@/content/task-schema'
import { RacerTag } from '@/features/race/racer-tag'
import { RACERS } from '@/lib/constants'
import {
	calibrationBuckets,
	jevCalibrationPoints,
	MAX_CONFIDENCE,
	MIN_CONFIDENCE,
	type CalibrationBucket
} from '@/runner/calibration'
import { userPoints, type Ratings } from './ratings'

const PERCENT = 100
const WIDTH = 480
const HEIGHT = 300
const PAD = { left: 48, right: 16, top: 16, bottom: 40 }
const PLOT_W = WIDTH - PAD.left - PAD.right
const PLOT_H = HEIGHT - PAD.top - PAD.bottom
const TICKS = [0, 0.25, 0.5, 0.75, 1]
const MARK_RADIUS = 6
const DIAGONAL_INSET = 0.05
const AXIS_FONT = 12

const x = (confidence: number) =>
	PAD.left + ((confidence - MIN_CONFIDENCE) / (MAX_CONFIDENCE - MIN_CONFIDENCE)) * PLOT_W
const y = (accuracy: number) => PAD.top + (1 - accuracy) * PLOT_H
const mid = (bucket: CalibrationBucket) => (bucket.from + bucket.to) / 2
const range = (bucket: CalibrationBucket) =>
	`${Math.round(bucket.from * PERCENT)}-${Math.round(bucket.to * PERCENT)}%`

type Series = { id: 'jev' | 'you'; label: string; buckets: CalibrationBucket[] }

function linePoints(buckets: CalibrationBucket[]): string {
	return buckets
		.flatMap((bucket) =>
			bucket.accuracy === null ? [] : [`${x(mid(bucket))},${y(bucket.accuracy)}`]
		)
		.join(' ')
}

function bucketText(bucket: CalibrationBucket): string {
	if (bucket.accuracy === null) return 'no picks'
	return `${Math.round(bucket.accuracy * bucket.count)} of ${bucket.count} right`
}

/**
 * Level 4 Reveal: how often each racer was right at each confidence level.
 * A well-calibrated racer sits on the dotted diagonal: right 70% of the time
 * when it says 70%. Hand-built SVG, with a table as the text alternative (R90).
 */
export function CalibrationChart({
	task,
	jev,
	ratings
}: {
	task: Task
	jev: Recording
	ratings: Ratings
}) {
	const jevBuckets = calibrationBuckets(jevCalibrationPoints(task, jev))
	const userBuckets = calibrationBuckets(userPoints(task, ratings))
	const hasUser = userBuckets.some((bucket) => bucket.count > 0)
	const series: Series[] = [
		{ id: 'jev', label: 'Jev', buckets: jevBuckets },
		...(hasUser ? [{ id: 'you' as const, label: 'You', buckets: userBuckets }] : [])
	]
	return (
		<section aria-labelledby="calibration-heading" className="flex flex-col gap-3">
			<h3 id="calibration-heading" className="text-text text-xl font-bold">
				How sure, and how often right
			</h3>
			<p className="text-text-muted">
				Each point shows how often a racer was right when it was that sure. The dotted diagonal is a
				perfectly calibrated racer.
				{hasUser ? '' : ' Rate the statements in Play to add your own line.'}
			</p>
			<svg
				viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
				role="img"
				aria-label="Calibration chart: how often each racer was right at each confidence level. The table below has the same numbers."
				className="max-w-xl"
			>
				{TICKS.map((tick) => (
					<g key={tick}>
						<line
							x1={PAD.left}
							x2={WIDTH - PAD.right}
							y1={y(tick)}
							y2={y(tick)}
							stroke="var(--border)"
						/>
						<text
							x={PAD.left - 8}
							y={y(tick)}
							textAnchor="end"
							dominantBaseline="middle"
							fontSize={AXIS_FONT}
							fill="var(--text-muted)"
						>
							{Math.round(tick * PERCENT)}%
						</text>
					</g>
				))}
				{jevBuckets.map((bucket) => (
					<text
						key={bucket.from}
						x={x(mid(bucket))}
						y={HEIGHT - 20}
						textAnchor="middle"
						fontSize={AXIS_FONT}
						fill="var(--text-muted)"
					>
						{range(bucket)}
					</text>
				))}
				<text
					x={PAD.left + PLOT_W / 2}
					y={HEIGHT - 4}
					textAnchor="middle"
					fontSize={AXIS_FONT}
					fill="var(--text-muted)"
				>
					How sure the racer was
				</text>
				<line
					x1={x(MIN_CONFIDENCE + DIAGONAL_INSET)}
					y1={y(MIN_CONFIDENCE + DIAGONAL_INSET)}
					x2={x(MAX_CONFIDENCE - DIAGONAL_INSET)}
					y2={y(MAX_CONFIDENCE - DIAGONAL_INSET)}
					stroke="var(--text-faint)"
					strokeDasharray="2 4"
					strokeWidth="2"
				/>
				{series.map((entry) => {
					const isJev = entry.id === 'jev'
					const stroke = isJev ? 'var(--jev)' : 'var(--text)'
					return (
						<g key={entry.id}>
							<polyline
								points={linePoints(entry.buckets)}
								fill="none"
								stroke={stroke}
								strokeWidth="2.5"
								strokeDasharray={isJev ? undefined : '6 4'}
							/>
							{entry.buckets.map((bucket) => {
								if (bucket.accuracy === null) return null
								return isJev ? (
									<circle
										key={bucket.from}
										cx={x(mid(bucket))}
										cy={y(bucket.accuracy)}
										r={MARK_RADIUS}
										fill={stroke}
									/>
								) : (
									<rect
										key={bucket.from}
										x={x(mid(bucket)) - MARK_RADIUS}
										y={y(bucket.accuracy) - MARK_RADIUS}
										width={MARK_RADIUS * 2}
										height={MARK_RADIUS * 2}
										fill="var(--bg)"
										stroke={stroke}
										strokeWidth="2.5"
									/>
								)
							})}
						</g>
					)
				})}
			</svg>
			<ul className="text-text flex flex-wrap items-center gap-4 text-sm">
				<li className="flex items-center gap-2">
					<RacerTag racer={RACERS.jev} />
					<span>filled circles, solid line</span>
				</li>
				{hasUser && <li>You: open squares, dashed line</li>}
			</ul>
			<div className="overflow-x-auto">
				<table className="w-full text-left text-sm">
					<caption className="sr-only">Right answers at each confidence level</caption>
					<thead>
						<tr>
							<th scope="col" className="text-text border-border border-b py-2 pr-4 font-bold">
								Sure at
							</th>
							{series.map((entry) => (
								<th
									key={entry.id}
									scope="col"
									className="text-text border-border border-b py-2 pr-4 font-bold"
								>
									{entry.label}
								</th>
							))}
						</tr>
					</thead>
					<tbody>
						{jevBuckets.map((bucket, index) => (
							<tr key={bucket.from}>
								<th scope="row" className="text-text border-border border-b py-2 pr-4 font-normal">
									{range(bucket)}
								</th>
								{series.map((entry) => {
									const cell = entry.buckets[index]
									return (
										<td
											key={entry.id}
											className="text-text border-border border-b py-2 pr-4 tabular-nums"
										>
											{cell ? bucketText(cell) : ''}
										</td>
									)
								})}
							</tr>
						))}
					</tbody>
				</table>
			</div>
		</section>
	)
}
