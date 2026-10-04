import { InfoIcon } from '@/components/ui/icons'
import { MODES, type Mode } from '@/lib/constants'

/** What the current mode means, on every level page (R84). */
export function ModeBanner({ mode }: { mode: Mode }) {
	const developer = mode === MODES.developer
	return (
		<p className="bg-surface border-border text-text-muted shadow-card flex items-start gap-2 rounded-lg border p-3 text-sm">
			<InfoIcon className="mt-0.5 shrink-0" />
			{developer ? (
				<span>
					<span className="text-text font-bold">Developer mode.</span> Races on the Play step call
					the real providers live, with your own keys, and cost you real money at their prices. The
					Reveal step shows your last live run beside the recorded runs, each labelled.
				</span>
			) : (
				<span>
					<span className="text-text font-bold">Beginner mode.</span> Every result here is a replay
					of real recorded runs, at the speed they really ran. No model is called.
				</span>
			)}
		</p>
	)
}
