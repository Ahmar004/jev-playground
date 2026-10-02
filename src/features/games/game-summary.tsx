import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { ExternalLinkIcon } from '@/components/ui/icons'
import type { Game } from '@/content/game-schema'
import { formatAccuracy, formatCost, formatDuration } from '@/features/race/format'
import type { RaceResult } from '@/features/race/race-stage'
import { racerName } from '@/features/race/racer-names'
import { RACERS, type Racer } from '@/lib/constants'
import { ROUTES, typesafeDocsUrl } from '@/lib/links'
import { isBetterRun } from '@/runner/better-run'
import type { RunTotals } from '@/runner/types'

type Row = { racer: Racer; name: string; totals: RunTotals }

function verdict(rows: Row[]): string {
	const jev = rows.find((row) => row.racer === RACERS.jev)?.totals
	const llm = rows.find((row) => row.racer === RACERS.llm)?.totals
	if (!jev || !llm || jev.accuracy === null || llm.accuracy === null) return 'The run finished.'
	const jevRun = { accuracy: jev.accuracy, wallMs: jev.wallMs }
	const llmRun = { accuracy: llm.accuracy, wallMs: llm.wallMs }
	if (isBetterRun(llmRun, jevRun)) return 'Jev won: more right, or as many right and faster.'
	if (isBetterRun(jevRun, llmRun)) return 'The LLM won: more right, or as many right and faster.'
	return 'A tie: the same accuracy and the same time.'
}

/**
 * A finished game: who won, the numbers (from the runner), the lesson and the
 * docs link (spec 7.1). `code` is Code's result for a game that has one.
 */
export function GameSummary({
	game,
	results,
	code
}: {
	game: Game
	results: RaceResult[]
	code: RunTotals | null
}) {
	const rows: Row[] = results.map(({ racer, modelId, totals }) => ({
		racer,
		name: racerName(racer, modelId),
		totals
	}))
	if (code) rows.push({ racer: RACERS.code, name: racerName(RACERS.code), totals: code })
	return (
		<Card role="region" aria-labelledby="summary-heading" className="flex flex-col gap-4 p-5">
			<h2 id="summary-heading" className="text-text text-2xl font-bold">
				Result
			</h2>
			<p className="text-text text-lg font-semibold">{verdict(rows)}</p>
			<div className="overflow-x-auto">
				<table className="w-full min-w-80 text-left text-sm">
					<caption className="sr-only">Accuracy, time and cost for each racer</caption>
					<thead className="text-text-muted">
						<tr>
							<th scope="col" className="py-1 pr-3">
								Racer
							</th>
							<th scope="col" className="py-1 pr-3">
								Right
							</th>
							<th scope="col" className="py-1 pr-3">
								Time
							</th>
							<th scope="col" className="py-1">
								Cost
							</th>
						</tr>
					</thead>
					<tbody className="text-text">
						{rows.map((row) => (
							<tr key={row.racer} className="border-border border-t">
								<th scope="row" className="py-2 pr-3 font-semibold">
									{row.name}
								</th>
								<td className="py-2 pr-3 tabular-nums">
									{row.totals.correct} of {row.totals.items} ({formatAccuracy(row.totals.accuracy)})
								</td>
								<td className="py-2 pr-3 tabular-nums">{formatDuration(row.totals.wallMs)}</td>
								<td className="py-2 tabular-nums">{formatCost(row.totals.costUsd)}</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>
			<p className="text-text font-medium">{game.lesson}</p>
			{game.why.map((paragraph) => (
				<p key={paragraph} className="text-text-muted">
					{paragraph}
				</p>
			))}
			<div className="flex flex-wrap gap-3">
				<Button asChild variant="secondary">
					<a href={typesafeDocsUrl(game.docs.path)} target="_blank" rel="noopener noreferrer">
						{game.docs.title} in the TypeSafe docs
						<ExternalLinkIcon />
					</a>
				</Button>
				<Button asChild variant="outline">
					<Link href={ROUTES.leaderboard}>See your Leaderboard</Link>
				</Button>
			</div>
		</Card>
	)
}
