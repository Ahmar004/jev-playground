'use client'

import { useEffect, useEffectEvent } from 'react'
import { Button } from '@/components/ui/button'
import { ExternalLinkIcon } from '@/components/ui/icons'
import type { Level } from '@/content/level-schema'
import type { Recording } from '@/content/recording-schema'
import type { Task } from '@/content/task-schema'
import { racerName } from '@/features/race/racer-names'
import { Scoreboard } from '@/features/race/scoreboard'
import { RACERS } from '@/lib/constants'
import { typesafeDocsUrl } from '@/lib/links'
import { ItemResults } from './item-results'
import { judgeAll, type Prediction } from './judge'
import { NotRecorded } from './play-step'
import { PredictionResults } from './prediction-results'
import { useCelebration } from './use-celebration'

const SECTION_TITLE = 'text-text text-xl font-bold'

/** Reveal: the prediction against the real result, every model's numbers, why, and the docs (R25-R27). */
export function RevealStep({
	level,
	task,
	jev,
	opponent,
	others,
	prediction,
	celebrate,
	onCelebrated,
	scoredAgainst,
	onReveal,
	onCheck,
	onRaceAgain
}: {
	level: Level
	task: Task
	jev: Recording | undefined
	opponent: Recording | undefined
	others: Recording[]
	prediction: Prediction
	// True only right after a correct first Reveal (the page's progress hook decides).
	celebrate: boolean
	// Called once the confetti fired, so it never fires twice.
	onCelebrated: () => void
	// The opponent the first Reveal was scored against, once it happened.
	scoredAgainst: string | null
	// Called with the opponent shown, once per mount and per opponent change.
	onReveal: (opponentModelId: string) => void
	onCheck: () => void
	onRaceAgain: () => void
}) {
	const verdicts = jev && opponent ? judgeAll(level, prediction, jev.totals, opponent.totals) : []
	useCelebration(celebrate, onCelebrated)
	const reveal = useEffectEvent(onReveal)
	const shownModelId = jev && opponent ? opponent.modelId : null
	useEffect(() => {
		if (shownModelId) reveal(shownModelId)
	}, [shownModelId])

	if (!jev || !opponent) {
		return <NotRecorded>The results appear here once this race is recorded.</NotRecorded>
	}
	const recordings = [jev, opponent, ...others]
	return (
		<section aria-labelledby="reveal-heading" className="flex flex-col gap-6">
			<h2 id="reveal-heading" tabIndex={-1} className="text-text text-2xl font-bold">
				What happened
			</h2>
			<PredictionResults
				questions={level.predict.questions}
				verdicts={verdicts}
				opponentModelId={opponent.modelId}
			/>
			{scoredAgainst && scoredAgainst !== opponent.modelId && (
				<p className="text-text-muted text-sm">
					Your prediction was scored against {racerName(RACERS.llm, scoredAgainst)} on your first
					Reveal.
				</p>
			)}
			<Scoreboard
				caption={`Every recorded model on the same ${task.items.length} items`}
				rows={recordings.map((recording) => ({
					racer: recording.racer,
					modelId: recording.modelId,
					recordedAt: recording.recordedAt,
					totals: recording.totals
				}))}
			/>
			<div className="flex flex-col gap-2">
				<h3 className={SECTION_TITLE}>Why</h3>
				{level.reveal.why.map((paragraph) => (
					<p key={paragraph} className="text-text-muted">
						{paragraph}
					</p>
				))}
			</div>
			<div className="flex flex-col gap-2">
				<h3 className={SECTION_TITLE}>Read more</h3>
				<ul className="flex flex-col gap-1">
					{level.docs.map((doc) => (
						<li key={doc.path}>
							<a
								href={typesafeDocsUrl(doc.path)}
								target="_blank"
								rel="noreferrer"
								className="text-accent focus-visible:outline-accent inline-flex items-center gap-1 rounded underline underline-offset-4 focus-visible:outline focus-visible:outline-2"
							>
								{doc.title} on TypeSafe docs<span className="sr-only"> (opens in a new tab)</span>
								<ExternalLinkIcon />
							</a>
						</li>
					))}
				</ul>
			</div>
			<ItemResults task={task} recordings={recordings} />
			<div className="flex flex-wrap gap-3">
				<Button type="button" onClick={onCheck}>
					Check what you learned
				</Button>
				<Button type="button" variant="outline" onClick={onRaceAgain}>
					Race again
				</Button>
			</div>
		</section>
	)
}
