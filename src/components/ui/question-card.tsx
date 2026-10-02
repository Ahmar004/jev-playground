import type { ReactNode, Ref } from 'react'
import { cn } from '@/lib/cn'

/**
 * A question with its choices on one card (Predict, Check, quizzes). The card
 * wraps the fieldset: a legend on a bordered fieldset sits on the border,
 * half outside the card.
 */
export function QuestionCard({
	legend,
	legendRef,
	legendClassName,
	disabled,
	className,
	children
}: {
	legend: ReactNode
	// Lets a step move focus to the question when it appears.
	legendRef?: Ref<HTMLLegendElement>
	legendClassName?: string
	disabled?: boolean
	className?: string
	children: ReactNode
}) {
	return (
		<div className={cn('bg-surface border-border shadow-card rounded-lg border p-4', className)}>
			<fieldset disabled={disabled} className="flex min-w-0 flex-col gap-3">
				<legend
					ref={legendRef}
					tabIndex={legendRef ? -1 : undefined}
					className={cn('text-text mb-3 font-bold', legendClassName)}
				>
					{legend}
				</legend>
				{children}
			</fieldset>
		</div>
	)
}
