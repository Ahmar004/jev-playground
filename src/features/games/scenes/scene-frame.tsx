import { RACER_STYLE } from '@/features/race/racer-style'
import { racerName } from '@/features/race/racer-names'
import { cn } from '@/lib/cn'
import type { Racer } from '@/lib/constants'

/** The card every game scene sits in. It is a labelled group, so its text stays readable by a screen reader. */
export function SceneFrame({
	label,
	children,
	className
}: {
	label: string
	children: React.ReactNode
	className?: string
}) {
	return (
		<div
			role="group"
			aria-label={label}
			className={cn(
				'bg-surface border-border shadow-card flex flex-col gap-4 rounded-lg border p-4',
				className
			)}
		>
			{children}
		</div>
	)
}

/** A racer's icon and name in its own color (R72); the color is never the only signal, the name is there too. */
export function RacerBadge({ racer, className }: { racer: Racer; className?: string }) {
	const style = RACER_STYLE[racer]
	return (
		<span className={cn('flex items-center gap-1.5 font-bold', style.text, className)}>
			{style.icons.map((Icon, index) => (
				<Icon key={index} size={18} />
			))}
			{racerName(racer)}
		</span>
	)
}
