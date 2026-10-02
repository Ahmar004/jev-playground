'use client'

import type { Guesses, TrickPair } from './pairs'

const CHOICES = [
	{ value: true, label: 'Jev gets fooled' },
	{ value: false, label: 'Jev sees through it' }
] as const

/**
 * Level 8 Play: for each pair, the user guesses whether the tricky wording fools
 * Jev. The question Jev is asked is the same for every message.
 */
export function TrickPicker({
	pairs,
	question,
	guesses,
	onGuess
}: {
	pairs: TrickPair[]
	question: string
	guesses: Guesses
	onGuess: (pairId: string, fooled: boolean) => void
}) {
	return (
		<section aria-labelledby="tricks-heading" className="flex flex-col gap-4">
			<div className="flex flex-col gap-1">
				<h3 id="tricks-heading" className="text-text text-xl font-bold">
					Which tricks fool Jev?
				</h3>
				<p className="text-text-muted">
					Jev is asked the same question about every message: &quot;{question}&quot; Each pair has a
					plain message and a tricky one. {Object.keys(guesses).length} of {pairs.length} guessed.
				</p>
			</div>
			<ol className="flex flex-col gap-4">
				{pairs.map((pair, index) => (
					<li
						key={pair.id}
						className="bg-surface border-border flex flex-col gap-3 rounded-lg border p-4"
					>
						<p className="text-text-muted text-sm font-bold">Pair {index + 1}</p>
						<div className="grid gap-3 sm:grid-cols-2">
							<p className="text-text text-sm break-words whitespace-pre-wrap">
								<span className="text-text-muted block font-bold">Plain</span>
								{pair.plain.text}
							</p>
							<p className="text-text text-sm break-words whitespace-pre-wrap">
								<span className="text-text-muted block font-bold">Tricky</span>
								{pair.tricked.text}
							</p>
						</div>
						<fieldset className="flex flex-wrap gap-4">
							<legend className="sr-only">
								Does the tricky message in pair {index + 1} fool Jev?
							</legend>
							{CHOICES.map((choice) => (
								<label key={choice.label} className="text-text flex items-center gap-2">
									<input
										type="radio"
										name={`guess-${pair.id}`}
										checked={guesses[pair.id] === choice.value}
										onChange={() => onGuess(pair.id, choice.value)}
										className="accent-accent size-5"
									/>
									{choice.label}
								</label>
							))}
						</fieldset>
					</li>
				))}
			</ol>
		</section>
	)
}
