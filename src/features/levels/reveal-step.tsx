'use client'

import { useEffect, useEffectEvent } from 'react'
import { Button } from '@/components/ui/button'
import { ExternalLinkIcon } from '@/components/ui/icons'
import type { Level } from '@/content/level-schema'
import type { Recording } from '@/content/recording-schema'
import { jevCodeRecording, type RaceRecording } from '@/runner/combine'
import { racerName } from '@/features/race/racer-names'
import { Scoreboard } from '@/features/race/scoreboard'
import { RACERS } from '@/lib/constants'
import { typesafeDocsUrl } from '@/lib/links'
import { ItemResults } from './item-results'
import { judgeAll, judgedTotals, type Prediction } from './judge'
import type { LevelStage } from './lineup'
import { NotRecorded } from './play-step'
import { PredictionResults } from './prediction-results'
import { useCelebration } from './use-celebration'

const SECTION_TITLE = 'text-text text-xl font-bold'

// The recordings one race shows: Jev, then Jev + Code on a combine task, then the opponent and the rest.
function stageRecordings(stage: LevelStage, opponentId: string): RaceRecording[] {
	const { jev, task } = stage
	if (!jev) return []
	const opponent = stage.opponents.find((recording) => recording.modelId === opponentId)
	const others = stage.opponents.filter((recording) => recording !== opponent)
	return [
		jev,
		...(task.combine ? [jevCodeRecording(task, jev)] : []),
		...(opponent ? [opponent] : []),
		...others
	]
}

/**
 * Reveal: the prediction against the real result, every model's numbers, why,
 * and the docs (R25-R27). `children` is the level's own widget (level 4's chart).
 */
export function RevealStep({
	level,
	stages,
	opponentId,
	prediction,
	celebrate,
	onCelebrated,
	scoredAgainst,
	onReveal,
	onCheck,
	onRaceAgain,
	children
}: {
	level: Level
	stages: LevelStage[]
	opponentId: string | undefined
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
	children?: React.ReactNode
}) {
	const recorded: Recording[] = stages
		.flatMap((stage) => (stage.jev ? [stage.jev] : []))
		.concat(stages.flatMap((stage) => stage.opponents))
	const totals = opponentId ? judgedTotals(level, recorded, opponentId) : null
	const verdicts = totals ? judgeAll(level, prediction, totals.jev, totals.opponent) : []
	useCelebration(celebrate, onCelebrated)
	const reveal = useEffectEvent(onReveal)
	const shownModelId = totals ? (opponentId ?? null) : null
	useEffect(() => {
		if (shownModelId) reveal(shownModelId)
	}, [shownModelId])

	if (!totals || !opponentId) {
		return <NotRecorded>The results appear here once this race is recorded.</NotRecorded>
	}
	return (
		<section aria-labelledby="reveal-heading" className="flex flex-col gap-6">
			<h2 id="reveal-heading" tabIndex={-1} className="text-text text-2xl font-bold">
				What happened
			</h2>
			<PredictionResults
				questions={level.predict.questions}
				verdicts={verdicts}
				opponentModelId={opponentId}
			/>
			{scoredAgainst && scoredAgainst !== opponentId && (
				<p className="text-text-muted text-sm">
					Your prediction was scored against {racerName(RACERS.llm, scoredAgainst)} on your first
					Reveal.
				</p>
			)}
			{stages.map((stage) => {
				const recordings = stageRecordings(stage, opponentId)
				return (
					<div key={stage.task.id} className="flex flex-col gap-4">
						{stages.length > 1 && <h3 className={SECTION_TITLE}>{stage.title}</h3>}
						<Scoreboard
							caption={`Every recorded model on the same ${stage.task.items.length} items`}
							rows={recordings.map((recording) => ({
								racer: recording.racer,
								modelId: recording.modelId,
								recordedAt: recording.recordedAt,
								totals: recording.totals
							}))}
						/>
						<ItemResults task={stage.task} recordings={recordings} />
					</div>
				)
			})}
			{children}
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
