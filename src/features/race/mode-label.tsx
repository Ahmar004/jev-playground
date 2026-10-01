import { cn } from '@/lib/cn'
import { recordedOn } from './format'

/** "Beginner mode - recorded <date> - <model id>" on every recorded result (R6, R84). Slice 8 adds Developer mode. */
export function ModeLabel({
	modelId,
	recordedAt,
	className
}: {
	modelId: string
	recordedAt: string
	className?: string
}) {
	return (
		<p className={cn('text-text-muted text-xs wrap-anywhere', className)}>
			Beginner mode - recorded {recordedOn(recordedAt)} - {modelId}
		</p>
	)
}
