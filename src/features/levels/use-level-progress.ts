'use client'

import { useMutation } from '@tanstack/react-query'
import { useState } from 'react'
import type { CheckQuestion } from '@/content/level-schema'
import { ANALYTICS_EVENTS } from '@/lib/analytics/events'
import { track } from '@/lib/analytics/track'
import { LEVEL_STATUS } from '@/lib/constants'
import { isStaleDeployError } from '@/lib/errors/stale-deploy'
import { toast } from '@/lib/toast'
import { useServerState } from '@/lib/use-server-state'
import {
	revealPrediction,
	submitCheck,
	submitFirstPlay,
	submitPrediction
} from '@/server/actions/progress'
import type { FirstPlay } from '@/server/progress/first-play'
import type { ActionResult } from '@/server/actions/validated-action'
import { nextStatusOnActivity } from '@/server/progress/rules'
import { announceAwards } from './awards-toast'
import type { Prediction } from './judge'
import type { LevelProgressView } from './level-progress'

/** An { ok: false } result is an error, so a mutation's onError runs for it. */
function unwrap<Output>(result: ActionResult<Output>): Output {
	if (!result.ok) throw new Error(result.error)
	return result.data
}

function errorMessage(error: unknown): string {
	return error instanceof Error ? error.message : 'Try again in a moment.'
}

/**
 * One level's saved progress for the page: optimistic updates that roll back on
 * failure, XP and badge toasts, and analytics. The server decides every result;
 * the client only shows it sooner.
 */
export function useLevelProgress(
	levelId: string,
	initial: LevelProgressView,
	questions: CheckQuestion[]
) {
	const [progress, setProgress] = useServerState(initial)
	const [celebrate, setCelebrate] = useState(false)
	const [pendingQuestionId, setPendingQuestionId] = useState<string | null>(null)

	const onError = (error: unknown, _input: unknown, previous: LevelProgressView | undefined) => {
		if (previous) setProgress(previous)
		if (isStaleDeployError(error)) return
		toast({
			title: "Couldn't save your progress",
			description: errorMessage(error),
			variant: 'destructive'
		})
	}
	const markDone = () => {
		setProgress((current) => ({ ...current, status: LEVEL_STATUS.done }))
		track(ANALYTICS_EVENTS.LEVEL_COMPLETED, { level_id: levelId })
	}

	const lock = useMutation({
		mutationFn: async (prediction: Prediction) =>
			unwrap(await submitPrediction({ levelId, prediction })),
		onMutate: (prediction) => {
			setProgress((current) => ({
				...current,
				prediction,
				status: nextStatusOnActivity(current.status)
			}))
			return progress
		},
		onError,
		onSuccess: (data, _prediction, previous) => {
			// After the first Reveal the server keeps the original picks (saved: false).
			if (!data.saved) {
				if (previous) setProgress((current) => ({ ...current, prediction: previous.prediction }))
				toast({
					title: 'Your picks are final',
					description: 'They were locked in at your first Reveal.'
				})
				return
			}
			track(ANALYTICS_EVENTS.PREDICTION_MADE, { level_id: levelId })
			if (previous?.status === null) {
				track(ANALYTICS_EVENTS.LEVEL_STARTED, { level_id: levelId })
			}
		}
	})

	const revealMutation = useMutation({
		mutationFn: async ({
			opponentModelId,
			play
		}: {
			opponentModelId: string
			play?: FirstPlay
		}) => {
			// A level game's first try must land before Reveal shows the answers.
			// It only decides a badge, so a failure never blocks the Reveal.
			const played = play ? await submitFirstPlay({ levelId, play }) : null
			const result = unwrap(await revealPrediction({ levelId, opponentModelId }))
			if (!played?.ok) return result
			return {
				...result,
				awards: {
					xp: result.awards.xp + played.data.awards.xp,
					badges: [...result.awards.badges, ...played.data.awards.badges]
				}
			}
		},
		onMutate: () => progress,
		onError,
		onSuccess: (result, { opponentModelId }) => {
			setProgress((current) => ({
				...current,
				revealed: true,
				predictionCorrect: result.predictionCorrect,
				// Only the first Reveal fixes the opponent; a repeat leaves it as stored.
				opponentModelId: result.firstReveal ? opponentModelId : current.opponentModelId,
				status: nextStatusOnActivity(current.status)
			}))
			if (result.firstReveal && result.predictionCorrect) setCelebrate(true)
			announceAwards(result.awards)
			if (result.levelDone) markDone()
		}
	})

	const check = useMutation({
		mutationFn: async (input: { questionId: string; optionId: string }) =>
			unwrap(await submitCheck({ levelId, ...input })),
		onMutate: ({ questionId, optionId }) => {
			setPendingQuestionId(questionId)
			const answerId = questions.find((question) => question.id === questionId)?.answerId
			setProgress((current) => ({
				...current,
				status: nextStatusOnActivity(current.status),
				answers: { ...current.answers, [questionId]: { optionId, correct: optionId === answerId } }
			}))
			return progress
		},
		onError,
		onSuccess: (result, { questionId }) => {
			setProgress((current) => ({
				...current,
				answers: { ...current.answers, [questionId]: result.stored }
			}))
			announceAwards(result.awards)
			if (result.levelDone) markDone()
		},
		onSettled: () => setPendingQuestionId(null)
	})

	return {
		progress,
		celebrate,
		pendingQuestionId,
		consumeCelebration: () => setCelebrate(false),
		lockIn: (prediction: Prediction) => lock.mutate(prediction),
		reveal: (opponentModelId: string, play?: FirstPlay) => {
			if (progress.revealed || revealMutation.isPending) return
			revealMutation.mutate({ opponentModelId, play })
		},
		answer: (questionId: string, optionId: string) => {
			if (progress.answers[questionId]) return
			check.mutate({ questionId, optionId })
		}
	}
}
