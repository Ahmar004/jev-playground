const SKELETON_ROWS = [0, 1, 2]

/** Path loading state, shaped like the level cards. */
export function PathSkeleton() {
	return (
		<div className="flex max-w-2xl flex-col gap-3" aria-hidden>
			{SKELETON_ROWS.map((row) => (
				<div key={row} className="skeleton h-24 rounded-lg" />
			))}
		</div>
	)
}
