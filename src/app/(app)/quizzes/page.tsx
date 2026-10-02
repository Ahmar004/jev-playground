import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import { QuizList } from '@/features/quizzes/quiz-list'
import { ROUTES } from '@/lib/links'
import { getSession } from '@/server/auth/session'
import { getQuizAttempts } from '@/server/data/quizzes'

export const metadata: Metadata = { title: "Quizzes - Jev's Playground" }

// Reads the signed-in user's attempts, so it sits under <Suspense>.
async function QuizListLoader() {
	const session = await getSession()
	if (!session) redirect(ROUTES.signIn)
	return <QuizList attempts={await getQuizAttempts(session.userId)} />
}

export default function QuizzesPage() {
	return (
		<main className="mx-auto flex w-full max-w-2xl flex-col gap-4">
			<h1 className="text-text text-3xl font-extrabold">Quizzes</h1>
			<p className="text-text-muted max-w-2xl text-lg">
				Which tool fits which job? Take the start quiz before you play and the end quiz after, to
				see what you learned. Both are optional.
			</p>
			<Suspense fallback={<div className="skeleton h-64 max-w-2xl rounded-lg" />}>
				<QuizListLoader />
			</Suspense>
		</main>
	)
}
