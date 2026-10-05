import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { SuccessIcon, WrongIcon } from '@/components/ui/icons'
import type { Quiz } from '@/content/quiz-schema'
import { QUIZ_IDS } from '@/lib/constants'
import { ROUTES } from '@/lib/links'
import type { QuizAnswers } from '@/server/quiz/score'
import { ImprovementNote } from './improvement-note'
import { RetryQuizButton } from './quiz-retry'
import { QUIZ_TOOL_LABELS, toolLabel } from './tools'

/**
 * Score, the explanation of every answer and the solutions (R58, R60), with the improvement when
 * both quizzes are done (R59). Shows the latest attempt, the one that counts, and offers a retry.
 */
export function QuizResults({
	quiz,
	answers,
	score,
	topicTitles,
	startScore,
	endScore
}: {
	quiz: Quiz
	answers: QuizAnswers
	score: number
	topicTitles: Record<string, string>
	startScore: number | null
	endScore: number | null
}) {
	const total = quiz.questions.length
	const other = quiz.id === QUIZ_IDS.start ? QUIZ_IDS.end : QUIZ_IDS.start
	return (
		<section aria-labelledby="results-heading" className="flex flex-col gap-4">
			<h2 id="results-heading" className="text-text text-2xl font-bold">
				You scored {score} of {total}
			</h2>
			<div className="flex flex-wrap items-center gap-3">
				<RetryQuizButton />
				<p className="text-text-muted text-sm">
					Your latest attempt counts for your score, XP and badges.
				</p>
			</div>
			<ImprovementNote start={startScore} end={endScore} total={total} />
			<ol className="flex flex-col gap-3">
				{quiz.questions.map((question, index) => {
					const picked = answers[question.id]
					const right = picked === question.answer
					return (
						<li key={question.id}>
							<Card className="flex flex-col gap-2 p-4">
								<p className="text-text-muted text-xs font-medium">
									Question {index + 1} - {topicTitles[question.topic] ?? question.topic}
								</p>
								<p className="text-text font-bold">{question.prompt}</p>
								<p
									className={`inline-flex items-center gap-2 font-bold ${right ? 'text-success' : 'text-danger'}`}
								>
									{right ? <SuccessIcon /> : <WrongIcon />}
									{right ? 'Right' : 'Not quite'}: you picked {toolLabel(picked)}
								</p>
								<p className="text-text">The answer: {QUIZ_TOOL_LABELS[question.answer]}</p>
								<p className="text-text-muted">{question.explanation}</p>
							</Card>
						</li>
					)
				})}
			</ol>
			<div className="flex flex-wrap gap-3">
				<RetryQuizButton variant="secondary" />
				<Button asChild variant="secondary">
					<Link href={ROUTES.quizzes}>All quizzes</Link>
				</Button>
				<Button asChild variant="secondary">
					<Link href={ROUTES.quiz(other)}>
						{other === QUIZ_IDS.end ? 'Take the end quiz' : 'See the start quiz'}
					</Link>
				</Button>
			</div>
		</section>
	)
}
