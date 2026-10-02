import { cn } from '@/lib/cn'
import { LEVEL_STEP_ORDER, LEVEL_STEPS, type LevelStep } from '@/lib/constants'

const STEP_LABELS: Record<LevelStep, string> = {
	[LEVEL_STEPS.learn]: 'Learn',
	[LEVEL_STEPS.predict]: 'Predict',
	[LEVEL_STEPS.play]: 'Play',
	[LEVEL_STEPS.reveal]: 'Reveal',
	[LEVEL_STEPS.check]: 'Check'
}

/** The level loop as a step list. Every step can be opened; none is locked (R23, R28). */
export function StepperNav({
	current,
	onSelect
}: {
	current: LevelStep
	onSelect: (step: LevelStep) => void
}) {
	return (
		<nav aria-label="Level steps">
			<ol className="grid grid-cols-2 gap-2 sm:grid-cols-5">
				{LEVEL_STEP_ORDER.map((step, index) => {
					const active = step === current
					return (
						<li key={step}>
							<button
								type="button"
								aria-current={active ? 'step' : undefined}
								onClick={() => onSelect(step)}
								className={cn(
									'focus-visible:outline-accent shadow-card w-full rounded-lg border px-3 py-2.5 text-left text-sm font-bold transition-all duration-300 focus-visible:outline focus-visible:outline-2',
									active
										? 'from-accent to-accent-hover text-accent-ink border-accent scale-[1.03] bg-gradient-to-br'
										: 'bg-surface text-text border-border hover:bg-surface-hover hover:shadow-card-hover hover:-translate-y-0.5'
								)}
							>
								{index + 1}. {STEP_LABELS[step]}
							</button>
						</li>
					)
				})}
			</ol>
		</nav>
	)
}
