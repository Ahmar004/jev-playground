'use client'

import { createContext, useContext, useState } from 'react'
import { Button } from '@/components/ui/button'
import type { QuizId } from '@/lib/constants'
import { QuizTaker, type PublicQuestion } from './quiz-taker'

type TakerProps = { quizId: QuizId; title: string; intro: string; questions: PublicQuestion[] }

const RetryContext = createContext<(() => void) | null>(null)

/**
 * A taken quiz's page (Step-42): the results (children), or the quiz again once the user
 * retries. Keyed by the attempt's time, so the saved retry's refresh shows its new results.
 */
export function QuizRetry({ taker, children }: { taker: TakerProps; children: React.ReactNode }) {
	const [retrying, setRetrying] = useState(false)
	if (retrying) return <QuizTaker {...taker} onCancel={() => setRetrying(false)} />
	return <RetryContext value={() => setRetrying(true)}>{children}</RetryContext>
}

/** Starts the quiz again; only inside QuizRetry. */
export function RetryQuizButton({ variant = 'primary' }: { variant?: 'primary' | 'secondary' }) {
	const retry = useContext(RetryContext)
	if (!retry) return null
	return (
		<Button type="button" variant={variant} onClick={retry}>
			Retry quiz
		</Button>
	)
}
