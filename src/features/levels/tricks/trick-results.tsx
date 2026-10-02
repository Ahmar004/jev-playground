import { SuccessIcon, WrongIcon, AlertIcon } from '@/components/ui/icons'
import { racerName } from '@/features/race/racer-names'
import { cn } from '@/lib/cn'
import { RACERS } from '@/lib/constants'
import { guessesRight, type Guesses, type TrickPair, type TrickSide } from './pairs'

const PERCENT = 100

function yesNo(value: boolean | null): string {
	if (value === null) return 'no answer'
	return value ? 'yes' : 'no'
}

function SideResult({ title, side, llmName }: { title: string; side: TrickSide; llmName: string }) {
	return (
		<div className="flex flex-col gap-1 text-sm">
			<p className="text-text-muted font-bold">{title}</p>
			<p className="text-text break-words whitespace-pre-wrap">{side.text}</p>
			<p className="text-text tabular-nums">
				Jev:{' '}
				{side.jevProbability === null
					? 'no answer'
					: `${Math.round(side.jevProbability * PERCENT)}% yes`}{' '}
				({side.jevRight === null ? 'no result' : side.jevRight ? 'right' : 'wrong'})
			</p>
			<p className="text-text-muted">
				{llmName}: {yesNo(side.llmYes)} (
				{side.llmRight === null ? 'no result' : side.llmRight ? 'right' : 'wrong'})
			</p>
		</div>
	)
}

function GuessLine({ pair, guess }: { pair: TrickPair; guess: boolean | undefined }) {
	if (guess === undefined)
		return <p className="text-text-muted text-sm">You did not guess this pair.</p>
	if (pair.fooled === null) return null
	const right = guess === pair.fooled
	return (
		<p
			className={cn(
				'inline-flex items-center gap-1 text-sm font-bold',
				right ? 'text-success' : 'text-danger'
			)}
		>
			{right ? <SuccessIcon /> : <WrongIcon />}
			{right ? 'You called it' : 'Not this time'}
		</p>
	)
}

/** Level 8 Reveal: each pair with Jev's real probability on both wordings, and the user's guess checked. */
export function TrickResults({
	pairs,
	guesses,
	opponentModelId
}: {
	pairs: TrickPair[]
	guesses: Guesses
	opponentModelId: string | undefined
}) {
	const llmName = racerName(RACERS.llm, opponentModelId)
	const fooledCount = pairs.filter((pair) => pair.fooled).length
	return (
		<section aria-labelledby="trick-results-heading" className="flex flex-col gap-4">
			<div className="flex flex-col gap-1">
				<h3 id="trick-results-heading" className="text-text text-xl font-bold">
					Your guesses against what happened
				</h3>
				<p className="text-text-muted">
					Jev was fooled by {fooledCount} of {pairs.length} tricky messages. You called{' '}
					{guessesRight(pairs, guesses)} of {pairs.length} pairs right.
				</p>
			</div>
			<ol className="flex flex-col gap-4">
				{pairs.map((pair, index) => (
					<li
						key={pair.id}
						className="bg-surface border-border flex flex-col gap-3 rounded-lg border p-4"
					>
						<p className="text-text font-bold">
							Pair {index + 1}:{' '}
							{pair.fooled === null ? (
								<span className="text-warning inline-flex items-center gap-1">
									<AlertIcon /> No result
								</span>
							) : pair.fooled ? (
								'Jev was fooled'
							) : (
								'Jev saw through it'
							)}
						</p>
						<div className="grid gap-3 sm:grid-cols-2">
							<SideResult title="Plain" side={pair.plain} llmName={llmName} />
							<SideResult title="Tricky" side={pair.tricked} llmName={llmName} />
						</div>
						<GuessLine pair={pair} guess={guesses[pair.id]} />
					</li>
				))}
			</ol>
		</section>
	)
}
