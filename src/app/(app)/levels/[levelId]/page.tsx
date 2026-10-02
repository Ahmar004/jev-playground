import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import { Suspense } from 'react'
import { getLevel, LEVELS } from '@/content/levels'
import { currentRecordings } from '@/content/recordings'
import { getTask } from '@/content/tasks'
import type { Level } from '@/content/level-schema'
import type { Recording } from '@/content/recording-schema'
import type { Task } from '@/content/task-schema'
import { LevelSkeleton } from '@/features/levels/level-skeleton'
import { LevelStepper } from '@/features/levels/level-stepper'
import { ROUTES } from '@/lib/links'
import { getSession } from '@/server/auth/session'
import { getLevelProgress } from '@/server/data/progress'

// Every level is prerendered from content/ (TECH-STACK.md > Rendering strategy: SSG shell + CSR).
export function generateStaticParams() {
	return [...LEVELS.keys()].map((levelId) => ({ levelId }))
}

export async function generateMetadata({
	params
}: PageProps<'/levels/[levelId]'>): Promise<Metadata> {
	const { levelId } = await params
	const level = getLevel(levelId)
	return { title: level ? `${level.title} - Jev's Playground` : "Jev's Playground" }
}

// Reads the signed-in user's saved progress, so it renders inside <Suspense>:
// the static shell above it still prerenders (TECH-STACK.md > Rendering strategy).
async function LevelProgressLoader({
	level,
	tasks,
	recordings
}: {
	level: Level
	tasks: Task[]
	recordings: Recording[]
}) {
	const session = await getSession()
	if (!session) redirect(ROUTES.signIn)
	const progress = await getLevelProgress(session.userId, level.id)
	return (
		<LevelStepper
			key={session.userId}
			level={level}
			tasks={tasks}
			recordings={recordings}
			initialProgress={progress}
		/>
	)
}

export default async function LevelPage({ params }: PageProps<'/levels/[levelId]'>) {
	const { levelId } = await params
	const level = getLevel(levelId)
	if (!level) notFound()
	const tasks = level.tasks.map((entry) => getTask(entry.id))
	// Only this page's recordings reach the client (R79).
	const recordings = tasks.flatMap((task) => currentRecordings(task.id))
	return (
		<Suspense fallback={<LevelSkeleton />}>
			<LevelProgressLoader level={level} tasks={tasks} recordings={recordings} />
		</Suspense>
	)
}
