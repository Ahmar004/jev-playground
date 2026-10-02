'use client'

import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { QuestionCard } from '@/components/ui/question-card'
import { QUIZ_TOOLS } from '@/content/quiz-schema'
import type { QuizId } from '@/lib/constants'
import { QUIZ_TOOL_LABELS } from './tools'
import { useQuizSubmit } from './use-quiz-submit'

const PERCENT = 100

export type PublicQuestion = { id: string; prompt: string; topicTitle: string }

/** One question per screen. The answers and explanations stay on the server until the quiz is submitted. */
export function QuizTaker({
	quizId,
	title,
	intro,
	questions
}: {
	quizId: QuizId
	title: string
	intro: string
	questions: PublicQuestion[]
}) {
	const [index, setIndex] = useState(0)
	const [picks, setPicks] = useState<Record<string, string>>({})
	const { submit, pending, done } = useQuizSubmit(quizId)
	const headingRef = useRef<HTMLLegendElement>(null)
	const moved = useRef(false)
	useEffect(() => {
		if (moved.current) headingRef.current?.focus()
	}, [index])

	const question = questions[index]
	if (!question) return null
	const pick = picks[question.id]
	const last = index === questions.length - 1

	return (
		<form
			className="flex max-w-2xl flex-col gap-4"
			onSubmit={(event) => {
				event.preventDefault()
				if (!pick || pending || done) return
				if (last) submit(picks)
				else {
					moved.current = true
					setIndex(index + 1)
				}
			}}
		>
			<h1 className="text-text text-3xl font-extrabold">{title}</h1>
			<p className="text-text-muted">{intro}</p>
			<p className="text-text-muted text-sm font-medium" aria-live="polite">
				Question {index + 1} of {questions.length} - {question.topicTitle}
			</p>
			{/* The text above says the same; this bar is decoration. */}
			<div aria-hidden className="bg-border/60 h-1.5 overflow-hidden rounded-full">
				<div
					className="from-accent via-jev to-llm h-full rounded-full bg-gradient-to-r transition-[width] duration-500"
					style={{ width: `${((index + 1) / questions.length) * PERCENT}%` }}
				/>
			</div>
			<QuestionCard
				key={question.id}
				className="animate-rise"
				legend={question.prompt}
				legendRef={headingRef}
				legendClassName="text-lg"
			>
				{QUIZ_TOOLS.map((tool) => (
					<label
						key={tool}
						className="bg-surface border-border hover:border-accent/50 hover:bg-surface-hover has-[:checked]:border-accent has-[:checked]:bg-accent/10 has-[:checked]:shadow-card has-[:focus-visible]:outline-accent flex cursor-pointer items-center gap-2 rounded-lg border p-3 transition-all duration-200 has-[:checked]:scale-[1.01] has-[:focus-visible]:outline has-[:focus-visible]:outline-2"
					>
						<input
							type="radio"
							name={question.id}
							value={tool}
							checked={pick === tool}
							onChange={() => setPicks((current) => ({ ...current, [question.id]: tool }))}
							className="accent-accent"
						/>
						<span className="text-text">{QUIZ_TOOL_LABELS[tool]}</span>
					</label>
				))}
			</QuestionCard>
			<div className="flex flex-wrap gap-3">
				<Button
					type="button"
					variant="outline"
					disabled={index === 0 || pending}
					onClick={() => {
						moved.current = true
						setIndex(index - 1)
					}}
				>
					Back
				</Button>
				<Button type="submit" disabled={!pick || pending || done}>
					{last ? (pending || done ? 'Scoring...' : 'Submit quiz') : 'Next'}
				</Button>
			</div>
		</form>
	)
}
