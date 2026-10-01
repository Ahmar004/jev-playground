import { InfoIcon } from '@/components/ui/icons'

/** What Beginner mode means, on every level page (R84). Slice 8 adds the Developer mode version. */
export function BeginnerBanner() {
	return (
		<p className="bg-surface border-border text-text-muted flex items-start gap-2 rounded-lg border p-3 text-sm">
			<InfoIcon className="mt-0.5 shrink-0" />
			<span>
				<span className="text-text font-bold">Beginner mode.</span> Every result here is a replay of
				real recorded runs, at the speed they really ran. No model is called.
			</span>
		</p>
	)
}
