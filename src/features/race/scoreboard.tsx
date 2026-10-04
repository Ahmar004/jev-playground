import { MODES, type Mode, type Racer } from '@/lib/constants'
import type { RunTotals } from '@/runner/types'
import { formatAccuracy, formatCost, formatDuration } from './format'
import { ModeLabel } from './mode-label'
import { RacerTag } from './racer-tag'

export type ScoreboardRow = {
	racer: Racer
	modelId: string
	recordedAt: string
	mode?: Mode
	totals: RunTotals
}

const HEAD_CELL = 'text-text border-border border-b py-2 pr-4 font-bold'
const CELL = 'border-border text-text border-b py-2 pr-4 tabular-nums'

/** Accuracy, time and cost per racer, straight from the runner's totals (DESIGN 3.3). */
export function Scoreboard({ rows, caption }: { rows: ScoreboardRow[]; caption: string }) {
	return (
		<div className="overflow-x-auto">
			<table className="w-full text-left text-sm">
				<caption className="text-text-muted pb-2 text-left text-sm">{caption}</caption>
				<thead>
					<tr>
						<th scope="col" className={HEAD_CELL}>
							Racer
						</th>
						<th scope="col" className={HEAD_CELL}>
							Accuracy
						</th>
						<th scope="col" className={HEAD_CELL}>
							Time
						</th>
						<th scope="col" className={HEAD_CELL}>
							Cost
						</th>
						<th scope="col" className={HEAD_CELL}>
							Couldn&apos;t parse
						</th>
					</tr>
				</thead>
				<tbody>
					{rows.map(({ racer, modelId, recordedAt, mode, totals }) => (
						<tr key={`${mode ?? MODES.beginner}-${racer}-${modelId}`}>
							<th scope="row" className={`${CELL} font-normal`}>
								<RacerTag racer={racer} modelId={modelId} />
								<ModeLabel modelId={modelId} recordedAt={recordedAt} mode={mode} />
							</th>
							<td className={CELL}>
								{totals.accuracy === null
									? formatAccuracy(null)
									: `${formatAccuracy(totals.accuracy)} (${totals.correct} of ${totals.scored})`}
							</td>
							<td className={CELL}>{formatDuration(totals.wallMs)}</td>
							<td className={CELL}>{formatCost(totals.costUsd)}</td>
							<td className={CELL}>{totals.parseFailures}</td>
						</tr>
					))}
				</tbody>
			</table>
		</div>
	)
}
