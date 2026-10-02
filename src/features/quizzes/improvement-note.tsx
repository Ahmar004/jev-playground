import { improvement } from './tools'

/** "You improved by N" once both quizzes are taken (R59); a neutral line when the score did not rise. */
export function ImprovementNote({
	start,
	end,
	total
}: {
	start: number | null
	end: number | null
	total: number
}) {
	const gain = improvement(start, end)
	if (gain === null) {
		return (
			<p className="text-text-muted">
				Take both quizzes to see how much you improved from the start to the end.
			</p>
		)
	}
	return (
		<p className="text-text font-medium">
			Start quiz {start} of {total}, end quiz {end} of {total}:{' '}
			{gain > 0
				? `you improved by ${gain} ${gain === 1 ? 'point' : 'points'}.`
				: gain === 0
					? 'the same score both times.'
					: `${-gain} ${gain === -1 ? 'point' : 'points'} lower this time.`}
		</p>
	)
}
