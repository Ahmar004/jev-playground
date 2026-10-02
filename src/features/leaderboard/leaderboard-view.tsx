import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { formatAccuracy, formatCost, formatDuration } from '@/features/race/format'
import { racerName } from '@/features/race/racer-names'
import { MODES, RACERS } from '@/lib/constants'
import { ROUTES } from '@/lib/links'
import type { LeaderboardRow } from '@/server/data/leaderboard'

const MODE_NAMES = { [MODES.beginner]: 'Beginner mode', [MODES.developer]: 'Developer mode' }
const COLUMNS = ['Racer', 'Mode', 'Right', 'Time', 'Cost', 'Runs']

/** The user's best results per game, model and mode, each labelled with its mode (R64). */
export function LeaderboardView({
	rows,
	gameTitles
}: {
	rows: LeaderboardRow[]
	gameTitles: Record<string, string>
}) {
	if (rows.length === 0) {
		return (
			<div className="bg-surface border-border flex max-w-2xl flex-col items-start gap-3 rounded-lg border p-5">
				<p className="text-text">
					Nothing here yet. Finish a VS game or Speed Race and your results appear on this page.
				</p>
				<Button asChild>
					<Link href={ROUTES.games}>Play a VS game</Link>
				</Button>
			</div>
		)
	}
	const gameIds = [...new Set(rows.map((row) => row.gameId))]
	return (
		<div className="flex flex-col gap-6">
			{gameIds.map((gameId) => {
				const title = gameTitles[gameId] ?? gameId
				return (
					<section key={gameId} aria-labelledby={`lb-${gameId}`} className="flex flex-col gap-2">
						<h2 id={`lb-${gameId}`} className="text-text text-xl font-bold">
							{title}
						</h2>
						<div className="overflow-x-auto">
							<table className="border-border w-full min-w-xl rounded-lg border text-left text-sm">
								<caption className="sr-only">Your best results in {title}</caption>
								<thead className="text-text-muted">
									<tr>
										{COLUMNS.map((heading) => (
											<th key={heading} scope="col" className="px-3 py-2">
												{heading}
											</th>
										))}
									</tr>
								</thead>
								<tbody className="text-text">
									{rows
										.filter((row) => row.gameId === gameId)
										.map((row) => (
											<tr key={`${row.modelId}-${row.mode}`} className="border-border border-t">
												<th scope="row" className="px-3 py-2 font-semibold wrap-anywhere">
													{racerName(
														row.modelId.startsWith('jev') ? RACERS.jev : RACERS.llm,
														row.modelId
													)}
												</th>
												<td className="px-3 py-2">{MODE_NAMES[row.mode]}</td>
												<td className="px-3 py-2 tabular-nums">{formatAccuracy(row.accuracy)}</td>
												<td className="px-3 py-2 tabular-nums">{formatDuration(row.wallMs)}</td>
												<td className="px-3 py-2 tabular-nums">{formatCost(row.costUsd)}</td>
												<td className="px-3 py-2 tabular-nums">{row.runs}</td>
											</tr>
										))}
								</tbody>
							</table>
						</div>
					</section>
				)
			})}
		</div>
	)
}
