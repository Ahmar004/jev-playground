import type { Metadata } from 'next'
import Link from 'next/link'
import { Card } from '@/components/ui/card'
import { GAMES } from '@/content/games'
import { ROUTES } from '@/lib/links'

export const metadata: Metadata = { title: "VS games - Jev's Playground" }

export default function GamesPage() {
	return (
		<main className="flex flex-col gap-4">
			<h1 className="text-text text-3xl font-extrabold">VS games</h1>
			<p className="text-text-muted max-w-2xl text-lg">
				Jev and an LLM play the same job against each other. Each finished game goes on your
				Leaderboard.
			</p>
			<ul className="grid gap-3 sm:grid-cols-2">
				{[...GAMES.values()].map((game) => (
					<li key={game.id}>
						<Card className="hover:bg-surface-hover h-full">
							<Link
								href={ROUTES.game(game.id)}
								className="focus-visible:outline-accent flex h-full flex-col gap-1 rounded-lg p-4 focus-visible:outline focus-visible:outline-2"
							>
								<span className="text-text text-lg font-semibold">{game.title}</span>
								<span className="text-text-muted">{game.blurb}</span>
							</Link>
						</Card>
					</li>
				))}
			</ul>
		</main>
	)
}
