import { cn } from '@/lib/cn'
import type { Racer } from '@/lib/constants'
import { racerName } from './racer-names'
import { RACER_STYLE } from './racer-style'

const ICON_SIZE = 18

/** The only way to render a racer's name: its icon in its color, always with the name (DESIGN 13.2). */
export function RacerTag({
	racer,
	modelId,
	className
}: {
	racer: Racer
	modelId?: string
	className?: string
}) {
	const style = RACER_STYLE[racer]
	return (
		<span className={cn('inline-flex items-center gap-1.5 font-bold', className)}>
			<span className={cn('inline-flex', style.text)}>
				{style.icons.map((Icon, index) => (
					<Icon key={index} size={ICON_SIZE} />
				))}
			</span>
			<span className="text-text">{racerName(racer, modelId)}</span>
		</span>
	)
}
