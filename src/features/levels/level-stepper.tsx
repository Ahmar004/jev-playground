'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import type { Level } from '@/content/level-schema'
import type { Recording } from '@/content/recording-schema'
import type { Task } from '@/content/task-schema'
import { ROUTES } from '@/lib/links'
import { LEVEL_STATUS, LEVEL_STEPS, LEVEL_WIDGETS } from '@/lib/constants'
import { BeginnerBanner } from './beginner-banner'
import { CalibrationChart } from './calibration/calibration-chart'
import { CalibrationForm } from './calibration/calibration-form'
import type { Ratings } from './calibration/ratings'
import { CheckStep } from './check-step'
import { LearnStep } from './learn-step'
import type { LevelProgressView } from './level-progress'
import { defaultOpponentId, levelStages, sharedOpponentIds } from './lineup'
import { PlayStep } from './play-step'
import { PredictStep } from './predict-step'
import { RevealStep } from './reveal-step'
import { StepperNav } from './stepper-nav'
import { useLevelProgress } from './use-level-progress'
import { useLevelStep } from './use-level-step'
import { useStepFocus } from './use-step-focus'

/**
 * One level's loop: Learn, Predict, Play, Reveal, Check (spec 6.1). Saved
 * progress comes from the server and is updated through useLevelProgress.
 * A level with several tasks stacks one race per task (level 3); a level with
 * a widget adds it to Play and Reveal (level 4's calibration).
 */
export function LevelStepper({
	level,
	tasks,
	recordings,
	initialProgress
}: {
	level: Level
	tasks: Task[]
	recordings: Recording[]
	initialProgress: LevelProgressView
}) {
	const { step, goTo } = useLevelStep()
	const router = useRouter()
	const { progress, celebrate, pendingQuestionId, lockIn, reveal, answer, consumeCelebration } =
		useLevelProgress(level.id, initialProgress, level.check.questions)
	// Confetti is for the first Reveal only: leaving Reveal uses the celebration up.
	useEffect(() => {
		if (celebrate && step !== LEVEL_STEPS.reveal) consumeCelebration()
	}, [celebrate, step, consumeCelebration])
	useStepFocus(step)
	const stages = levelStages(level, tasks, recordings)
	const opponentIds = sharedOpponentIds(stages)
	const [opponentId, setOpponentId] = useState(() =>
		defaultOpponentId(
			stages[0]?.opponents.filter((recording) => opponentIds.includes(recording.modelId)) ?? []
		)
	)
	// Level 4: the user's own ratings live only in the page, never saved.
	const [ratings, setRatings] = useState<Ratings>({})
	const calibrationStage =
		level.widget === LEVEL_WIDGETS.calibration ? stages.find((stage) => stage.judged) : undefined

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
					initial={progress.prediction}
					locked={progress.revealed}
					onSubmit={(next) => {
						if (!progress.revealed) lockIn(next)
						goTo(LEVEL_STEPS.play)
					}}
				/>
			)}
			{step === LEVEL_STEPS.play && (
				<PlayStep
					stages={stages}
					opponentIds={opponentIds}
					opponentId={opponentId}
					onOpponentChange={setOpponentId}
					onReveal={() => goTo(LEVEL_STEPS.reveal)}
				>
					{calibrationStage && (
						<CalibrationForm
							task={calibrationStage.task}
							ratings={ratings}
							onRate={(itemId, rating) =>
								setRatings((previous) => ({ ...previous, [itemId]: rating }))
							}
						/>
					)}
				</PlayStep>
			)}
			{step === LEVEL_STEPS.reveal && (
				<RevealStep
					level={level}
					stages={stages}
					opponentId={opponentId}
					prediction={progress.prediction}
					celebrate={celebrate}
					onCelebrated={consumeCelebration}
					scoredAgainst={progress.revealed ? progress.opponentModelId : null}
					onReveal={reveal}
					onCheck={() => goTo(LEVEL_STEPS.check)}
					onRaceAgain={() => goTo(LEVEL_STEPS.play)}
				>
					{calibrationStage?.jev && (
						<CalibrationChart
							task={calibrationStage.task}
							jev={calibrationStage.jev}
							ratings={ratings}
						/>
					)}
				</RevealStep>
			)}
			{step === LEVEL_STEPS.check && (
				<CheckStep
					questions={level.check.questions}
					answers={progress.answers}
					pendingQuestionId={pendingQuestionId}
					levelDone={progress.status === LEVEL_STATUS.done}
					onAnswer={answer}
					onGoToReveal={() => goTo(LEVEL_STEPS.reveal)}
					onBackToPath={() => router.push(ROUTES.path)}
				/>
			)}
		</main>
	)
}
