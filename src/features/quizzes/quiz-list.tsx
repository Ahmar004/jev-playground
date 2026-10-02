import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { QUIZZES } from '@/content/quizzes'
import { QUIZ_IDS } from '@/lib/constants'
import { ROUTES } from '@/lib/links'
import type { QuizAttempts } from '@/server/data/quizzes'
import { ImprovementNote } from './improvement-note'

const ORDER = [QUIZ_IDS.start, QUIZ_IDS.end] as const

/** Both quizzes with the user's score, and the improvement once both are taken. Quizzes are optional (R57). */
export function QuizList({ attempts }: { attempts: QuizAttempts }) {
	const total = QUIZZES[QUIZ_IDS.start].questions.length
	return (
		<div className="flex max-w-2xl flex-col gap-4">
			<ul className="flex flex-col gap-3">
				{ORDER.map((quizId) => {
					const quiz = QUIZZES[quizId]
					const attempt = attempts[quizId]
					return (
						<li key={quizId}>
							<Card className="flex flex-col gap-2 p-4">
								<h2 className="text-text text-lg font-bold">{quiz.title}</h2>
								<p className="text-text-muted">{quiz.intro}</p>
								<p className="text-text font-medium">
									{attempt
										? `Scored ${attempt.score} of ${quiz.questions.length}`
										: `${quiz.questions.length} questions, not taken yet`}
								</p>
								<div>
									<Button asChild variant={attempt ? 'secondary' : 'primary'}>
										<Link href={ROUTES.quiz(quizId)}>
											{attempt ? 'See results and solutions' : `Take the ${quizId} quiz`}
										</Link>
									</Button>
								</div>
							</Card>
						</li>
					)
				})}
			</ul>
			<ImprovementNote
				start={attempts[QUIZ_IDS.start]?.score ?? null}
				end={attempts[QUIZ_IDS.end]?.score ?? null}
				total={total}
			/>
		</div>
	)
}
