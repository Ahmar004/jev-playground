'use client'

import { useState } from 'react'
import type { Level } from '@/content/level-schema'
import type { Recording } from '@/content/recording-schema'
import type { Task } from '@/content/task-schema'
import { LEVEL_STEPS } from '@/lib/constants'
import { BeginnerBanner } from './beginner-banner'
import type { Prediction } from './judge'
import { LearnStep } from './learn-step'
import { defaultOpponentId, raceLineup } from './lineup'
import { PlayStep } from './play-step'
import { PredictStep } from './predict-step'
import { RevealStep } from './reveal-step'
import { StepperNav } from './stepper-nav'
import { useLevelStep } from './use-level-step'

/**
 * One level's loop: Learn, Predict, Play, Reveal (spec 6.1). The prediction
 * and opponent live here until slice 5 stores them. Level 3 (slice 6) races
 * two tasks; levels with one task pass it here.
 */
export function LevelStepper({
	level,
	task,
	recordings
}: {
	level: Level
	task: Task
	recordings: Recording[]
}) {
	const { step, goTo } = useLevelStep()
	const lineup = raceLineup(recordings)
	const [prediction, setPrediction] = useState<Prediction>({})
	const [opponentId, setOpponentId] = useState(() => defaultOpponentId(lineup.opponents))
	const opponent = lineup.opponents.find((recording) => recording.modelId === opponentId)

	return (
		<main className="flex max-w-4xl flex-col gap-6">
			<div className="flex flex-col gap-1">
				<p className="text-text-muted text-sm font-bold">Level {level.order}</p>
				<h1 className="text-text text-3xl font-extrabold">{level.title}</h1>
			</div>
			<BeginnerBanner />
			<StepperNav current={step} onSelect={goTo} />
			{step === LEVEL_STEPS.learn && (
				<LearnStep learn={level.learn} onNext={() => goTo(LEVEL_STEPS.predict)} />
			)}
			{step === LEVEL_STEPS.predict && (
				<PredictStep
					questions={level.predict.questions}
					initial={prediction}
					onSubmit={(next) => {
						setPrediction(next)
						goTo(LEVEL_STEPS.play)
					}}
				/>
			)}
			{step === LEVEL_STEPS.play && (
				<PlayStep
					task={task}
					jev={lineup.jev}
					opponents={lineup.opponents}
					opponentId={opponentId}
					onOpponentChange={setOpponentId}
					onReveal={() => goTo(LEVEL_STEPS.reveal)}
				/>
			)}
			{step === LEVEL_STEPS.reveal && (
				<RevealStep
					level={level}
					task={task}
					jev={lineup.jev}
					opponent={opponent}
					others={lineup.opponents.filter((recording) => recording !== opponent)}
					prediction={prediction}
					onRaceAgain={() => goTo(LEVEL_STEPS.play)}
				/>
			)}
		</main>
	)
}
