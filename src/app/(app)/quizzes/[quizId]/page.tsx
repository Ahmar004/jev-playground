import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import { Suspense } from 'react'
import { LEVELS } from '@/content/levels'
import { getQuiz } from '@/content/quizzes'
import { QuizResults } from '@/features/quizzes/quiz-results'
import { QuizTaker } from '@/features/quizzes/quiz-taker'
import { QUIZ_IDS, isQuizId, type QuizId } from '@/lib/constants'
import { ROUTES } from '@/lib/links'
import { getSession } from '@/server/auth/session'
import { getQuizAttempts } from '@/server/data/quizzes'

// Both quizzes are prerendered from content/ (SSG shell + per-user PPR).
export function generateStaticParams() {
	return Object.values(QUIZ_IDS).map((quizId) => ({ quizId }))
}

export async function generateMetadata({
	params
}: PageProps<'/quizzes/[quizId]'>): Promise<Metadata> {
	const { quizId } = await params
	return { title: `${isQuizId(quizId) ? getQuiz(quizId).title : 'Quiz'} - Jev's Playground` }
}

const TOPIC_TITLES: Record<string, string> = Object.fromEntries(
	[...LEVELS.values()].map((level) => [level.id, level.title])
)

// Reads the user's attempt: no attempt means the quiz, and an attempt means
// the results. The answers reach the browser only in the results.
async function QuizLoader({ quizId }: { quizId: QuizId }) {
	const session = await getSession()
	if (!session) redirect(ROUTES.signIn)
	const attempts = await getQuizAttempts(session.userId)
	const quiz = getQuiz(quizId)
	const attempt = attempts[quizId]
	if (!attempt) {
		return (
			<QuizTaker
				key={session.userId}
				quizId={quizId}
				title={quiz.title}
				intro={quiz.intro}
				questions={quiz.questions.map(({ id, prompt, topic }) => ({
					id,
					prompt,
					topicTitle: TOPIC_TITLES[topic] ?? topic
				}))}
			/>
		)
	}
	return (
		<div className="flex max-w-2xl flex-col gap-4">
			<h1 className="text-text text-3xl font-extrabold">{quiz.title}</h1>
			<QuizResults
				quiz={quiz}
				answers={attempt.answers}
				score={attempt.score}
				topicTitles={TOPIC_TITLES}
				startScore={attempts[QUIZ_IDS.start]?.score ?? null}
				endScore={attempts[QUIZ_IDS.end]?.score ?? null}
			/>
		</div>
	)
}

export default async function QuizPage({ params }: PageProps<'/quizzes/[quizId]'>) {
	const { quizId } = await params
	if (!isQuizId(quizId)) notFound()
	return (
		<main>
			<Suspense
				fallback={
					<div className="bg-surface-hover h-64 max-w-2xl animate-pulse rounded-lg motion-reduce:animate-none" />
				}
			>
				<QuizLoader quizId={quizId} />
			</Suspense>
		</main>
	)
}
