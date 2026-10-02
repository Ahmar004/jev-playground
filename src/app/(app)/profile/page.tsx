import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import { getQuiz } from '@/content/quizzes'
import { ProfileView } from '@/features/profile/profile-view'
import { QUIZ_IDS } from '@/lib/constants'
import { ROUTES } from '@/lib/links'
import { getSession } from '@/server/auth/session'
import { getProfile } from '@/server/data/profile'

export const metadata: Metadata = { title: "Your profile - Jev's Playground" }

const QUIZ_TOTAL = getQuiz(QUIZ_IDS.start).questions.length

// Per-user data, so it sits under <Suspense>: the heading prerenders as the static shell.
async function ProfileLoader() {
	const session = await getSession()
	if (!session) redirect(ROUTES.signIn)
	const profile = await getProfile(session.userId)
	return <ProfileView key={session.userId} profile={profile} quizTotal={QUIZ_TOTAL} />
}

export default function ProfilePage() {
	return (
		<main className="flex flex-col gap-4">
			<h1 className="text-text text-3xl font-extrabold">Your profile</h1>
			<Suspense fallback={<div className="skeleton h-96 max-w-3xl rounded-lg" />}>
				<ProfileLoader />
			</Suspense>
		</main>
	)
}
