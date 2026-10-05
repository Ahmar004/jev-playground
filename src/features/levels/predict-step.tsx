'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { QuestionCard } from '@/components/ui/question-card'
import { PREDICTABLE_RACERS, type Level } from '@/content/level-schema'
import { RacerTag } from '@/features/race/racer-tag'
import type { Prediction } from './judge'
import { GUIDE_TARGETS } from '@/features/guide/guide'

/** Predict: one two-way pick per question, locked in with Enter or the button (spec 6.1). */
export function PredictStep({
	intro,
	questions,
	initial,
	locked = false,
	onSubmit
}: {
	// What is about to race, so the questions have their context.
	intro: string
	questions: Level['predict']['questions']
	initial: Prediction
	// True once the first Reveal fixed the picks (spec 6.1): they show, but can't change.
	locked?: boolean
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
			<div className="flex flex-col gap-1" data-guide={GUIDE_TARGETS.predict}>
				<h2 id="predict-heading" tabIndex={-1} className="text-text text-2xl font-bold">
					Predict
				</h2>
				<p className="text-text-muted">{intro}</p>
			</div>
			{questions.map((question) => (
				<QuestionCard key={question.metric} legend={question.prompt} disabled={locked}>
					<div className="grid grid-cols-2 gap-3">
						{PREDICTABLE_RACERS.map((racer) => (
							<label
								key={racer}
								className="bg-surface border-border hover:border-accent/50 hover:bg-surface-hover has-[:checked]:border-accent has-[:checked]:bg-accent/10 has-[:checked]:shadow-card has-[:focus-visible]:outline-accent flex cursor-pointer items-center gap-2 rounded-lg border p-3 transition-all duration-200 has-[:checked]:scale-[1.01] has-[:focus-visible]:outline has-[:focus-visible]:outline-2"
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
				</QuestionCard>
			))}
			{locked && (
				<p className="text-text-muted text-sm">
					Your picks were locked in at your first Reveal, so they cannot change.
				</p>
			)}
			{!complete && !locked && (
				<p className="text-text-muted text-sm">Pick one answer for each question.</p>
			)}
			<div>
				<Button type="submit" disabled={!complete}>
					{locked ? 'Back to the race' : 'Lock in my prediction'}
				</Button>
			</div>
		</form>
	)
}
