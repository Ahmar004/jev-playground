'use client'

import { useRef, useState } from 'react'
import type { Level, RouterTool } from '@/content/level-schema'
import type { Task } from '@/content/task-schema'
import { COMBINE_FN_IDS, LEVEL_WIDGETS } from '@/lib/constants'
import type { CombineArgs } from '@/runner/code/combine-fns'
import type { FirstPlay } from '@/server/progress/first-play'
import { CalibrationChart } from './calibration/calibration-chart'
import { CalibrationForm } from './calibration/calibration-form'
import type { Rating, Ratings } from './calibration/ratings'
import type { LevelStage } from './lineup'
import type { Assignments } from './router/outcomes'
import { RouterGame } from './router/router-game'
import { RouterResults } from './router/router-results'
import { useCodeResults } from './router/use-code-results'
import { SignalPanel } from './signals/signal-panel'
import { trickPairs, type Guesses } from './tricks/pairs'
import { TrickPicker } from './tricks/trick-picker'
import { TrickResults } from './tricks/trick-results'
import { defaultWeights, type Weights } from './weights/composite'
import { WeightsPanel } from './weights/weights-panel'
import { useFirstPlay } from './use-first-play'

/**
 * The state of a level's own widget, kept in the stepper so it survives moving
 * between steps. It is the user's play, not progress; only the first Router
 * sort and the trick guesses go to the server, for their badges.
 */
export function useWidgetState(level: Level, stages: LevelStage[], tasks: Task[]) {
	const combineStage = stages.find(
		(stage) => stage.task.combine === COMBINE_FN_IDS.weightedComposite
	)
	const [ratings, setRatings] = useState<Ratings>({})
	const [weights, setWeights] = useState<Weights>(() =>
		combineStage ? defaultWeights(combineStage.task) : {}
	)
	const [assignments, setAssignments] = useState<Assignments>({})
	const [ran, setRan] = useState(false)
	const [guesses, setGuesses] = useState<Guesses>({})
	const firstPlay = useFirstPlay(level.id)
	const sortSent = useRef(false)
	const codeResults = useCodeResults(tasks, level.widget === LEVEL_WIDGETS.router)
	const combineArgs: CombineArgs | undefined =
		level.widget === LEVEL_WIDGETS.weights ? { weights } : undefined
	return {
		ratings,
		rate: (itemId: string, rating: Rating) =>
			setRatings((previous) => ({ ...previous, [itemId]: rating })),
		weights,
		setWeight: (key: string, weight: number) =>
			setWeights((previous) => ({ ...previous, [key]: weight })),
		assignments,
		assign: (taskId: string, tool: RouterTool | null) =>
			setAssignments((previous) => {
				const next = { ...previous }
				if (tool === null) delete next[taskId]
				else next[taskId] = tool
				return next
			}),
		ran,
		run: () => {
			setRan(true)
			// Only the first run of this visit is sent; the server counts only the first ever.
			if (sortSent.current) return
			sortSent.current = true
			firstPlay.submit({ kind: LEVEL_WIDGETS.router, assignments })
		},
		guesses,
		guess: (pairId: string, fooled: boolean) =>
			setGuesses((previous) => ({ ...previous, [pairId]: fooled })),
		codeResults,
		combineArgs
	}
}
export type WidgetState = ReturnType<typeof useWidgetState>

type WidgetProps = {
	level: Level
	stages: LevelStage[]
	opponentId: string | undefined
	state: WidgetState
}

function trickData(stages: LevelStage[], opponentId: string | undefined) {
	const stage = stages[0]
	if (!stage?.jev) return null
	const opponent = stage.opponents.find((recording) => recording.modelId === opponentId)
	return { stage, jev: stage.jev, opponent, pairs: trickPairs(stage.task, stage.jev, opponent) }
}

/** Level 8's guesses, sent with the first Reveal once every pair has one (trickster badge). */
export function tricksFirstPlay(stages: LevelStage[], guesses: Guesses): FirstPlay | undefined {
	const data = trickData(stages, undefined)
	if (!data || data.pairs.some((pair) => guesses[pair.id] === undefined)) return undefined
	return { kind: LEVEL_WIDGETS.tricks, guesses }
}

function trickQuestion(task: Task): string {
	if (!('questions' in task.jev)) return ''
	const instructions = Object.values(task.jev.questions)[0]?.instructions
	return typeof instructions === 'string' ? instructions : ''
}

/** What a level adds to Play, above its races (or in place of them for the Router). */
export function PlayWidget({ level, stages, opponentId, state }: WidgetProps) {
	switch (level.widget) {
		case LEVEL_WIDGETS.calibration: {
			const stage = stages.find((candidate) => candidate.judged)
			return stage ? (
				<CalibrationForm task={stage.task} ratings={state.ratings} onRate={state.rate} />
			) : null
		}
		case LEVEL_WIDGETS.weights: {
			const stage = stages.find((candidate) => candidate.task.combine)
			return stage?.jev ? (
				<WeightsPanel
					task={stage.task}
					jev={stage.jev}
					weights={state.weights}
					onChange={state.setWeight}
				/>
			) : null
		}
		case LEVEL_WIDGETS.router:
			return level.router ? (
				<>
					<RouterGame
						cards={level.router}
						assignments={state.assignments}
						onAssign={state.assign}
						onRun={state.run}
					/>
					{state.ran && (
						<RouterResults
							cards={level.router}
							stages={stages}
							opponentId={opponentId}
							assignments={state.assignments}
							codeResults={state.codeResults}
						/>
					)}
				</>
			) : null
		case LEVEL_WIDGETS.tricks: {
			const data = trickData(stages, opponentId)
			return data ? (
				<TrickPicker
					pairs={data.pairs}
					question={trickQuestion(data.stage.task)}
					guesses={state.guesses}
					onGuess={state.guess}
				/>
			) : null
		}
		default:
			return null
	}
}

/** What a level adds to Reveal, after the scoreboards. */
export function RevealWidget({ level, stages, opponentId, state }: WidgetProps) {
	switch (level.widget) {
		case LEVEL_WIDGETS.calibration: {
			const stage = stages.find((candidate) => candidate.judged)
			return stage?.jev ? (
				<CalibrationChart task={stage.task} jev={stage.jev} ratings={state.ratings} />
			) : null
		}
		case LEVEL_WIDGETS.router:
			return level.router ? (
				<RouterResults
					cards={level.router}
					stages={stages}
					opponentId={opponentId}
					assignments={state.assignments}
					codeResults={state.codeResults}
				/>
			) : null
		case LEVEL_WIDGETS.signals: {
			const stage = stages[0]
			const opponent = stage?.opponents.find((recording) => recording.modelId === opponentId)
			return stage?.jev ? (
				<SignalPanel task={stage.task} jev={stage.jev} opponent={opponent} />
			) : null
		}
		case LEVEL_WIDGETS.tricks: {
			const data = trickData(stages, opponentId)
			return data ? (
				<TrickResults pairs={data.pairs} guesses={state.guesses} opponentModelId={opponentId} />
			) : null
		}
		default:
			return null
	}
}
