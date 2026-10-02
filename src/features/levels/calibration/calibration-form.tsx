'use client'

import type { Task } from '@/content/task-schema'
import { valueText } from '@/features/race/answer-text'
import { MAX_CONFIDENCE, MIN_CONFIDENCE } from '@/runner/calibration'
import {
	clampConfidence,
	CONFIDENCE_STEP,
	DEFAULT_CONFIDENCE,
	type Rating,
	type Ratings
} from './ratings'

const PERCENT = 100

function percent(value: number): string {
	return `${Math.round(value * PERCENT)}%`
}

/** Level 4 Play: the user calls each statement true or false and says how sure they are (R33). */
export function CalibrationForm({
	task,
	ratings,
	onRate
}: {
	task: Task
	ratings: Ratings
	onRate: (itemId: string, rating: Rating) => void
}) {
	const answered = task.items.filter((item) => ratings[item.id]).length
	return (
		<section aria-labelledby="rate-heading" className="flex flex-col gap-4">
			<div className="flex flex-col gap-1">
				<h3 id="rate-heading" className="text-text text-xl font-bold">
					Rate each statement
				</h3>
				<p className="text-text-muted">
					Call each one true or false, then say how sure you are, from 50% (a coin flip) to 100%
					(certain). {answered} of {task.items.length} rated. You can skip any of them.
				</p>
			</div>
			<ol className="flex flex-col gap-4">
				{task.items.map((item, index) => {
					const rating = ratings[item.id]
					return (
						<li
							key={item.id}
							className="bg-surface border-border flex flex-col gap-3 rounded-lg border p-4"
						>
							<p className="text-text">
								<span className="text-text-muted mr-2 font-bold">{index + 1}.</span>
								{valueText(item.state)}
							</p>
							<fieldset className="flex flex-wrap gap-4">
								<legend className="sr-only">Is statement {index + 1} true or false?</legend>
								{[true, false].map((says) => (
									<label key={String(says)} className="text-text flex items-center gap-2">
										<input
											type="radio"
											name={`says-${item.id}`}
											checked={rating?.says === says}
											onChange={() =>
												onRate(item.id, {
													says,
													confidence: rating?.confidence ?? DEFAULT_CONFIDENCE
												})
											}
											className="accent-accent size-5"
										/>
										{says ? 'True' : 'False'}
									</label>
								))}
							</fieldset>
							<label className="text-text-muted flex flex-wrap items-center gap-3 text-sm">
								How sure are you?
								<input
									type="range"
									min={MIN_CONFIDENCE}
									max={MAX_CONFIDENCE}
									step={CONFIDENCE_STEP}
									value={rating?.confidence ?? DEFAULT_CONFIDENCE}
									disabled={!rating}
									onChange={(event) =>
										rating &&
										onRate(item.id, {
											says: rating.says,
											confidence: clampConfidence(event.currentTarget.valueAsNumber)
										})
									}
									className="accent-accent w-48 max-w-full"
								/>
								<span className="text-text font-bold tabular-nums">
									{percent(rating?.confidence ?? DEFAULT_CONFIDENCE)}
								</span>
								{!rating && <span>(call it true or false first)</span>}
							</label>
						</li>
					)
				})}
			</ol>
		</section>
	)
}
