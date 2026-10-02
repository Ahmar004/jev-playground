const SKELETON_STEPS = 4

/** Shown while the stepper reads ?step= (DESIGN 6: every screen has a loading state). */
export function LevelSkeleton() {
	return (
		<div role="status" aria-busy="true" className="flex max-w-4xl flex-col gap-6">
			<span className="sr-only">Loading the level</span>
			<div className="skeleton h-9 w-64 rounded" />
			<div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
				{Array.from({ length: SKELETON_STEPS }, (_, index) => (
					<div key={index} className="skeleton h-10 rounded-lg" />
				))}
			</div>
			<div className="skeleton h-48 rounded-lg" />
		</div>
	)
}
