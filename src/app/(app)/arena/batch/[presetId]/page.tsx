import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { batchPresetIds, batchView } from '@/content/arena'
import { BatchPlay } from '@/features/arena/batch-play'
import { ROUTES } from '@/lib/links'

// Prerendered from content/ (SSG shell + CSR race), like the games.
export function generateStaticParams() {
	return batchPresetIds().map((presetId) => ({ presetId }))
}

export async function generateMetadata({
	params
}: PageProps<'/arena/batch/[presetId]'>): Promise<Metadata> {
	const { presetId } = await params
	const view = batchView(presetId)
	return { title: view ? `${view.preset.title} batch - Jev's Playground` : "Jev's Playground" }
}

export default async function ArenaBatchPage({ params }: PageProps<'/arena/batch/[presetId]'>) {
	const { presetId } = await params
	const view = batchView(presetId)
	if (!view) notFound()
	return (
		<main className="flex flex-col gap-4">
			<Link
				href={ROUTES.arenaPreset(view.preset.id)}
				className="text-accent w-fit text-sm underline"
			>
				Back to the Arena
			</Link>
			<h1 className="text-text text-3xl font-extrabold">{view.preset.title}: batch</h1>
			<p className="text-text-muted max-w-2xl text-lg">
				{view.preset.blurb} Here Jev and an LLM do all {view.task.items.length} items of the task,
				so speed and cost add up to something you can compare.
			</p>
			<BatchPlay task={view.task} recordings={view.recordings} lesson={view.preset.lesson} />
		</main>
	)
}
