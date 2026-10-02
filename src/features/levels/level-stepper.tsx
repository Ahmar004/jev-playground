'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import type { Level } from '@/content/level-schema'
import type { Recording } from '@/content/recording-schema'
import type { Task } from '@/content/task-schema'
import { ROUTES } from '@/lib/links'
import { useMode } from '@/features/mode/mode-context'
import { gameRunInput } from '@/features/games/game-run'
import { useRecordGameRun } from '@/features/games/use-record-game-run'
import type { RaceResult } from '@/features/race/race-stage'
import {
	LEVEL_STATUS,
	LEVEL_STEPS,
	LEVEL_WIDGETS,
	MODES,
	SPEED_RACE_GAME_ID
} from '@/lib/constants'
import { ModeBanner } from './mode-banner'
import { CheckStep } from './check-step'
import { LearnStep } from './learn-step'
import type { LevelProgressView } from './level-progress'
import { defaultOpponentId, levelStages, sharedOpponentIds } from './lineup'
import { PlayWidget, RevealWidget, useWidgetState } from './level-widgets'
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
	const { mode, setMode } = useMode()
	const router = useRouter()
	const { progress, celebrate, pendingQuestionId, lockIn, reveal, answer, consumeCelebration } =
		useLevelProgress(level.id, initialProgress, level.check.questions)
	// Confetti is for the first Reveal only: leaving Reveal uses the celebration up.
	useEffect(() => {
		if (celebrate && step !== LEVEL_STEPS.reveal) consumeCelebration()
	}, [celebrate, step, consumeCelebration])
	useStepFocus(step)
	// Speed Race is timed, so a finished race goes on the Leaderboard (DESIGN 8).
	const { record } = useRecordGameRun()
	const onRaceFinished = (results: RaceResult[]) => {
		const input = gameRunInput({ gameId: level.id, mode, results })
		if (input) record(input)
	}
	const stages = levelStages(level, tasks, recordings)
	const opponentIds = sharedOpponentIds(stages)
	const [opponentId, setOpponentId] = useState(() =>
		defaultOpponentId(
			stages[0]?.opponents.filter((recording) => opponentIds.includes(recording.modelId)) ?? []
		)
	)
	// A level's own widget (ratings, weights, sorted cards, guesses) lives in the page, never saved.
	const widget = useWidgetState(level, stages, tasks)
	const widgetProps = { level, stages, opponentId, state: widget }

	return (
		<main className="flex max-w-4xl flex-col gap-6">
			<div className="flex flex-col gap-1">
				<p className="text-jev text-sm font-bold tracking-wide uppercase">Level {level.order}</p>
				<h1 className="text-text text-3xl font-extrabold">{level.title}</h1>
			</div>
			<ModeBanner mode={mode} />
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
					combineArgs={widget.combineArgs}
					hideRaces={level.widget === LEVEL_WIDGETS.router}
					mode={mode}
					onUseBeginner={() => setMode(MODES.beginner)}
					onRaceFinished={level.id === SPEED_RACE_GAME_ID ? onRaceFinished : undefined}
				>
					{level.widget && <PlayWidget {...widgetProps} />}
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
					combineArgs={widget.combineArgs}
					showStages={level.widget !== LEVEL_WIDGETS.router}
				>
					<RevealWidget {...widgetProps} />
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
