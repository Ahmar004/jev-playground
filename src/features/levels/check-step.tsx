'use client'

import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { QuestionCard } from '@/components/ui/question-card'
import { SuccessIcon, WrongIcon } from '@/components/ui/icons'
import type { CheckQuestion } from '@/content/level-schema'
import type { LevelProgressView } from './level-progress'
import { GUIDE_TARGETS } from '@/features/guide/guide'

const PRACTICE_NOTE = 'Practice only: your first answer is the one that counts.'

const resultId = (questionId: string) => `${questionId}-result`
const optionId = (questionId: string, id: string) => `${questionId}-option-${id}`

type Retry = { optionId: string | null }

/** Check: one question at a time, the first answer is stored and counts; retries are practice (spec 6.1). */
export function CheckStep({
	questions,
	answers,
	pendingQuestionId,
	levelDone,
	onAnswer,
	onGoToReveal,
	onBackToPath
}: {
	questions: CheckQuestion[]
	answers: LevelProgressView['answers']
	pendingQuestionId: string | null
	levelDone: boolean
	onAnswer: (questionId: string, optionId: string) => void
	onGoToReveal: () => void
	onBackToPath: () => void
}) {
	const [picks, setPicks] = useState<Record<string, string>>({})
	// A question in practice: optionId null while picking, then the local pick once checked.
	const [retries, setRetries] = useState<Record<string, Retry>>({})
	// The element to focus once it exists: the control that held focus goes away, and
	// the result it leads to may only render on a later pass.
	const pendingFocus = useRef<string | null>(null)
	useEffect(() => {
		const id = pendingFocus.current
		const element = id ? document.getElementById(id) : null
		if (element) {
			element.focus()
			pendingFocus.current = null
		}
	}, [answers, retries, picks])
	const allAnswered = questions.every((question) => answers[question.id] !== undefined)

	return (
		<section aria-labelledby="check-heading" className="flex flex-col gap-6">
			<h2
				id="check-heading"
				tabIndex={-1}
				data-guide={GUIDE_TARGETS.check}
				className="text-text text-2xl font-bold"
			>
				Check
			</h2>
			{questions.map((question) => {
				const stored = answers[question.id]
				const retry = retries[question.id]
				const picking = !stored || retry?.optionId === null
				const shownOptionId = retry?.optionId ?? stored?.optionId
				const shownRight = shownOptionId === question.answerId
				const answerText = question.options.find((option) => option.id === question.answerId)?.text
				const pick = picks[question.id]
				const [firstOption] = question.options
				return (
					<form
						key={question.id}
						className="flex flex-col gap-3"
						onSubmit={(event) => {
							event.preventDefault()
							if (!pick) return
							if (stored)
								setRetries((current) => ({ ...current, [question.id]: { optionId: pick } }))
							else onAnswer(question.id, pick)
							pendingFocus.current = resultId(question.id)
							setPicks((current) => ({ ...current, [question.id]: '' }))
						}}
					>
						<QuestionCard legend={question.prompt}>
							{question.options.map((option) => (
								<label
									key={option.id}
									className="bg-surface border-border hover:border-accent/50 hover:bg-surface-hover has-[:checked]:border-accent has-[:checked]:bg-accent/10 has-[:checked]:shadow-card has-[:focus-visible]:outline-accent flex cursor-pointer items-center gap-2 rounded-lg border p-3 transition-all duration-200 has-[:checked]:scale-[1.01] has-[:focus-visible]:outline has-[:focus-visible]:outline-2"
								>
									<input
										id={optionId(question.id, option.id)}
										type="radio"
										name={question.id}
										value={option.id}
										disabled={!picking}
										checked={picking ? pick === option.id : shownOptionId === option.id}
										onChange={() =>
											setPicks((current) => ({ ...current, [question.id]: option.id }))
										}
										className="accent-accent"
									/>
									<span className="text-text">{option.text}</span>
								</label>
							))}
						</QuestionCard>
						{picking && (
							<div>
								<Button type="submit" disabled={!pick || pendingQuestionId === question.id}>
									Check answer
								</Button>
							</div>
						)}
						<div className="flex flex-col gap-2" aria-live="polite">
							{!picking && (
								<>
									<p
										id={resultId(question.id)}
										tabIndex={-1}
										className={`inline-flex items-center gap-2 font-bold ${shownRight ? 'text-success' : 'text-danger'}`}
									>
										{shownRight ? <SuccessIcon /> : <WrongIcon />}
										{shownRight ? 'Right' : 'Not quite'}
									</p>
									<p className="text-text font-bold">The answer: {answerText}</p>
									<p className="text-text-muted">{question.explanation}</p>
									{retry && <p className="text-text-muted text-sm">{PRACTICE_NOTE}</p>}
									{!shownRight && (
										<div>
											<Button
												type="button"
												variant="outline"
												onClick={() => {
													setRetries((current) => ({
														...current,
														[question.id]: { optionId: null }
													}))
													if (firstOption)
														pendingFocus.current = optionId(question.id, firstOption.id)
												}}
											>
												Try again
											</Button>
										</div>
									)}
								</>
							)}
						</div>
					</form>
				)
			})}
			{allAnswered && (
				<div className="flex flex-col gap-3">
					{levelDone ? (
						<p className="text-text text-xl font-bold">Level complete</p>
					) : (
						<div className="flex flex-wrap items-center gap-3">
							<p className="text-text-muted">Reach Reveal to finish this level.</p>
							<Button type="button" variant="outline" onClick={onGoToReveal}>
								Go to Reveal
							</Button>
						</div>
					)}
					<div>
						<Button type="button" onClick={onBackToPath}>
							Back to Path
						</Button>
					</div>
				</div>
			)}
		</section>
	)
}
