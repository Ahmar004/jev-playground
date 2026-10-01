'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { PREDICTABLE_RACERS, type Level } from '@/content/level-schema'
import { RacerTag } from '@/features/race/racer-tag'
import type { Prediction } from './judge'

/** Predict: one two-way pick per question, locked in with Enter or the button (spec 6.1). */
export function PredictStep({
	questions,
	initial,
	onSubmit
}: {
	questions: Level['predict']['questions']
	initial: Prediction
	onSubmit: (prediction: Prediction) => void
}) {
	const [picks, setPicks] = useState<Prediction>(initial)
	const complete = questions.every((question) => picks[question.metric] !== undefined)
	return (
		<form
			aria-labelledby="predict-heading"
			className="flex flex-col gap-4"
			onSubmit={(event) => {
				event.preventDefault()
				if (complete) onSubmit(picks)
			}}
		>
			<h2 id="predict-heading" className="text-text text-2xl font-bold">
				Predict
			</h2>
			{questions.map((question) => (
				<fieldset
					key={question.metric}
					className="bg-surface border-border flex flex-col gap-3 rounded-lg border p-4"
				>
					<legend className="text-text px-1 font-bold">{question.prompt}</legend>
					<div className="grid grid-cols-2 gap-3">
						{PREDICTABLE_RACERS.map((racer) => (
							<label
								key={racer}
								className="border-border has-[:checked]:border-accent has-[:checked]:bg-surface-hover has-[:focus-visible]:outline-accent flex cursor-pointer items-center gap-2 rounded-lg border p-3 has-[:focus-visible]:outline has-[:focus-visible]:outline-2"
							>
								<input
									type="radio"
									name={question.metric}
									value={racer}
									checked={picks[question.metric] === racer}
									onChange={() => setPicks((current) => ({ ...current, [question.metric]: racer }))}
									className="accent-accent"
								/>
								<RacerTag racer={racer} />
							</label>
						))}
					</div>
				</fieldset>
			))}
			{!complete && <p className="text-text-muted text-sm">Pick one answer for each question.</p>}
			<div>
				<Button type="submit" disabled={!complete}>
					Lock in my prediction
				</Button>
			</div>
		</form>
	)
}
