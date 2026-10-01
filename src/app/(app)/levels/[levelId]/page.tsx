import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Suspense } from 'react'
import { getLevel, LEVELS } from '@/content/levels'
import { currentRecordings } from '@/content/recordings'
import { getTask } from '@/content/tasks'
import { LevelSkeleton } from '@/features/levels/level-skeleton'
import { LevelStepper } from '@/features/levels/level-stepper'

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

export default async function LevelPage({ params }: PageProps<'/levels/[levelId]'>) {
	const { levelId } = await params
	const level = getLevel(levelId)
	if (!level) notFound()
	const [taskId] = level.taskIds
	if (!taskId) notFound()
	const task = getTask(taskId)
	// Only this page's recordings reach the client (R79).
	const recordings = currentRecordings(task.id)
	return (
		<Suspense fallback={<LevelSkeleton />}>
			<LevelStepper level={level} task={task} recordings={recordings} />
		</Suspense>
	)
}
