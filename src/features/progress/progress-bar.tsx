import Link from 'next/link'
import { ROUTES } from '@/lib/links'

const PERCENT = 100

/** Path progress as a bar with "done/total" text; it links to the Path page. */
export function ProgressBar({ done, total }: { done: number; total: number }) {
	const percent = total > 0 ? Math.min(PERCENT, (done / total) * PERCENT) : 0
	return (
		<Link
			href={ROUTES.path}
			className="focus-visible:outline-accent flex items-center gap-2 rounded focus-visible:outline focus-visible:outline-2"
		>
			<div
				role="progressbar"
				aria-label="Path progress"
				aria-valuenow={done}
				aria-valuemin={0}
				aria-valuemax={total}
				aria-valuetext={`${done} of ${total} levels done`}
				className="bg-surface-hover h-2 w-16 overflow-hidden rounded-full sm:w-24"
			>
				{/* A percentage is data, not a design value: the one allowed inline style. */}
				<div className="bg-accent h-full" style={{ width: `${percent}%` }} />
			</div>
			<span className="text-text text-sm font-medium tabular-nums">
				{done}/{total}
			</span>
		</Link>
	)
}
