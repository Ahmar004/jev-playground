import { cn } from '@/lib/cn'
import { MODES, type Mode } from '@/lib/constants'
import { recordedOn, runTime } from './format'

/**
 * Says where a result came from, on every result (R6, R13, R84): "Beginner
 * mode - recorded <date> - <model id>" or "Developer mode - run <time> - <model id>".
 * `at` is the recording date, or the start of a live run.
 */
export function ModeLabel({
	modelId,
	recordedAt,
	mode = MODES.beginner,
	className
}: {
	modelId: string
	recordedAt: string
	mode?: Mode
	className?: string
}) {
	return (
		<p className={cn('text-text-muted text-xs wrap-anywhere', className)}>
			{mode === MODES.developer
				? `Developer mode - ${recordedAt ? `run ${runTime(recordedAt)}` : 'not run yet'} - ${modelId}`
				: `Beginner mode - recorded ${recordedOn(recordedAt)} - ${modelId}`}
		</p>
	)
}
