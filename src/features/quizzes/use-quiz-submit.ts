'use client'

import { useMutation } from '@tanstack/react-query'
import { announceAwards } from '@/features/levels/awards-toast'
import { ANALYTICS_EVENTS } from '@/lib/analytics/events'
import { track } from '@/lib/analytics/track'
import { toast } from '@/lib/toast'
import { submitQuiz } from '@/server/actions/quiz'
import type { QuizId } from '@/lib/constants'

/** Submits a finished quiz. The server scores it, and its refresh swaps the page to the results. */
export function useQuizSubmit(quizId: QuizId) {
	const mutation = useMutation({
		mutationFn: async (answers: Record<string, string>) => {
			const result = await submitQuiz({ quizId, answers })
			if (!result.ok) throw new Error(result.error)
			return result.data
		},
		onSuccess: (data) => {
			if (data.firstAttempt) {
				track(ANALYTICS_EVENTS.QUIZ_COMPLETED, { quiz_id: quizId, score: data.score })
			}
			announceAwards(data.awards)
		},
		onError: (error: unknown) =>
			toast({
				title: "Couldn't submit the quiz",
				description: error instanceof Error ? error.message : 'Try again in a moment.',
				variant: 'destructive'
			})
	})
	return { submit: mutation.mutate, pending: mutation.isPending, done: mutation.isSuccess }
}
