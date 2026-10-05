import { cn } from '@/lib/cn'
import { MODES, type Mode } from '@/lib/constants'
import { recordedOn, runTime, runTimeUtc } from './format'

/**
 * Says where a result came from, on every result (R6, R13, R84): "Beginner
 * mode - recorded <date> - <model id>" or "Developer mode - run <time> - <model id>".
 * `at` is the recording date, or the start of a live run. `utc` dates the run
 * in UTC for a page rendered on the server and read in any zone (a share).
 */
export function ModeLabel({
	modelId,
	recordedAt,
	mode = MODES.beginner,
	utc = false,
	className
}: {
	modelId: string
	recordedAt: string
	mode?: Mode
	utc?: boolean
	className?: string
}) {
	const at = utc ? runTimeUtc : runTime
	return (
		<p className={cn('text-text-muted text-xs wrap-anywhere', className)}>
			{mode === MODES.developer
				? `Developer mode - ${recordedAt ? `run ${at(recordedAt)}` : 'not run yet'} - ${modelId}`
				: `Beginner mode - recorded ${recordedOn(recordedAt)} - ${modelId}`}
		</p>
	)
}
