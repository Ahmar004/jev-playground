import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { GAMES, getGame } from '@/content/games'
import { currentRecordings } from '@/content/recordings'
import { getTask } from '@/content/tasks'
import { GamePlay } from '@/features/games/game-play'
import { ROUTES } from '@/lib/links'

// Every game is prerendered from content/ (TECH-STACK.md > Rendering strategy: SSG shell + CSR).
export function generateStaticParams() {
	return [...GAMES.keys()].map((gameId) => ({ gameId }))
}

export async function generateMetadata({
	params
}: PageProps<'/games/[gameId]'>): Promise<Metadata> {
	const { gameId } = await params
	const game = getGame(gameId)
	return { title: game ? `${game.title} - Jev's Playground` : "Jev's Playground" }
}

export default async function GamePage({ params }: PageProps<'/games/[gameId]'>) {
	const { gameId } = await params
	const game = getGame(gameId)
	if (!game) notFound()
	const task = getTask(game.taskId)
	// Only this game's recordings reach the client (R79).
	const recordings = currentRecordings(task.id)
	return (
		<main className="flex flex-col gap-4">
			<Link href={ROUTES.games} className="text-accent w-fit text-sm underline">
				All games
			</Link>
			<h1 className="text-text text-3xl font-extrabold">{game.title}</h1>
			<p className="text-text-muted max-w-2xl text-lg">{game.blurb}</p>
			<GamePlay game={game} task={task} recordings={recordings} />
		</main>
	)
}
