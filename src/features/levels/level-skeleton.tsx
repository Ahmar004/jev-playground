const SKELETON_STEPS = 4

/** Shown while the stepper reads ?step= (DESIGN 6: every screen has a loading state). */
export function LevelSkeleton() {
	return (
		<div role="status" aria-busy="true" className="flex max-w-4xl flex-col gap-6">
			<span className="sr-only">Loading the level</span>
			<div className="bg-surface-hover h-9 w-64 animate-pulse rounded motion-reduce:animate-none" />
			<div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
				{Array.from({ length: SKELETON_STEPS }, (_, index) => (
					<div
						key={index}
						className="bg-surface-hover h-10 animate-pulse rounded-lg motion-reduce:animate-none"
					/>
				))}
			</div>
			<div className="bg-surface-hover h-48 animate-pulse rounded-lg motion-reduce:animate-none" />
		</div>
	)
}
