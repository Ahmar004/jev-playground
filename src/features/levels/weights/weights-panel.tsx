'use client'

import { SuccessIcon, WrongIcon } from '@/components/ui/icons'
import type { Recording } from '@/content/recording-schema'
import type { Task } from '@/content/task-schema'
import { valueText } from '@/features/race/answer-text'
import { cn } from '@/lib/cn'
import {
	compositeRows,
	MAX_WEIGHT,
	MIN_WEIGHT,
	weightQuestions,
	weightsAreEmpty,
	type Weights
} from './composite'

const PERCENT = 100

/**
 * Level 5 Play: one slider per small question. Code combines Jev's recorded
 * answers with these weights, so the composite changes at once and Jev is never
 * asked again. The numbers come from the runner's combine function.
 */
export function WeightsPanel({
	task,
	jev,
	weights,
	onChange
}: {
	task: Task
	jev: Recording
	weights: Weights
	onChange: (key: string, weight: number) => void
}) {
	const questions = weightQuestions(task)
	const rows = compositeRows(task, jev, weights)
	return (
		<section aria-labelledby="weights-heading" className="flex flex-col gap-4">
			<div className="flex flex-col gap-1">
				<h3 id="weights-heading" className="text-text text-xl font-bold">
					Set the weights
				</h3>
				<p className="text-text-muted">
					Jev answered five small questions about each review. Decide how much each one matters,
					from {MIN_WEIGHT} (ignore it) to {MAX_WEIGHT}. Code combines the answers, so the scores
					below change as you move a slider.
				</p>
			</div>
			<ul className="flex flex-col gap-3">
				{questions.map(({ key, text }) => (
					<li key={key}>
						<label className="text-text flex flex-wrap items-center gap-3">
							<span className="min-w-0 flex-1 basis-64">{text}</span>
							<input
								type="range"
								min={MIN_WEIGHT}
								max={MAX_WEIGHT}
								step={1}
								value={weights[key] ?? 0}
								onChange={(event) => onChange(key, event.currentTarget.valueAsNumber)}
								className="accent-accent w-40 max-w-full"
							/>
							<span className="text-text w-6 text-right font-bold tabular-nums">
								{weights[key] ?? 0}
							</span>
						</label>
					</li>
				))}
			</ul>
			{weightsAreEmpty(weights) && (
				<p role="status" className="text-warning font-bold">
					Every weight is 0, so there is nothing to combine. Turn one up.
				</p>
			)}
			<ol className="flex flex-col gap-2">
				{task.items.map((item, index) => {
					const row = rows.find((candidate) => candidate.itemId === item.id)
					return (
						<li
							key={item.id}
							className="bg-surface border-border shadow-card flex flex-col gap-2 rounded-lg border p-3"
						>
							<p className="text-text text-sm">
								<span className="text-text-muted mr-2 font-bold">{index + 1}.</span>
								{valueText(item.state)}
							</p>
							<p className="text-text flex flex-wrap items-center gap-2 text-sm">
								<span className="font-bold tabular-nums">
									Score:{' '}
									{row?.composite == null ? 'n/a' : `${Math.round(row.composite * PERCENT)}%`}
								</span>
								<span>{row?.verdict == null ? '' : row.verdict ? 'Helpful' : 'Not helpful'}</span>
								{row?.correct != null && (
									<span
										className={cn(
											'inline-flex items-center gap-1 font-bold',
											row.correct ? 'text-success' : 'text-danger'
										)}
									>
										{row.correct ? <SuccessIcon /> : <WrongIcon />}
										{row.correct ? 'Matches the label' : 'Misses the label'}
									</span>
								)}
							</p>
						</li>
					)
				})}
			</ol>
		</section>
	)
}
