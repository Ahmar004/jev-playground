import type { RouterCard } from '@/content/level-schema'
import type { LevelStage } from '@/features/levels/lineup'
import { OUTCOME_COPY } from '@/features/levels/item-results'
import { answerText, itemOutcome } from '@/features/race/answer-text'
import { formatCost, formatDuration } from '@/features/race/format'
import { ModeLabel } from '@/features/race/mode-label'
import { racerName } from '@/features/race/racer-names'
import { RacerTag } from '@/features/race/racer-tag'
import { cn } from '@/lib/cn'
import type { ItemResult } from '@/runner/types'
import type { Assignments, ToolOutcome } from './outcomes'

function ResultBody({ tool, result }: { tool: ToolOutcome; result: ItemResult }) {
	const copy = OUTCOME_COPY[itemOutcome(result)]
	const answer = answerText(tool.tool, result)
	return (
		<>
			<p className="text-text break-words whitespace-pre-wrap">{answer ?? result.raw}</p>
			<p className={cn('inline-flex items-center gap-1 font-bold', copy.tone)}>
				<copy.Icon />
				{copy.text}
			</p>
			<p className="text-text-muted tabular-nums">
				{formatDuration(result.latencyMs)} - {formatCost(result.costUsd)}
			</p>
		</>
	)
}

function ToolResult({ outcome, chosen }: { outcome: ToolOutcome; chosen: boolean }) {
	return (
		<div
			className={cn(
				'flex min-w-0 flex-col gap-1 rounded-lg border p-3 text-sm wrap-anywhere',
				chosen ? 'border-accent bg-surface-hover' : 'border-border'
			)}
		>
			<RacerTag racer={outcome.tool} modelId={outcome.modelId} />
			{outcome.source && outcome.modelId && (
				<ModeLabel
					modelId={outcome.modelId}
					recordedAt={outcome.source.at}
					mode={outcome.source.mode}
				/>
			)}
			{chosen && <p className="text-accent font-bold">Your pick</p>}
			{outcome.result ? (
				<ResultBody tool={outcome} result={outcome.result} />
			) : (
				<p className="text-text-muted">{outcome.missing}</p>
			)}
		</div>
	)
}

function verdictText(card: RouterCard, pick: Assignments[string] | undefined): string {
	if (pick === undefined) return 'You did not sort this card.'
	if (pick === card.best) return `Right tool: ${racerName(pick)} suits this job best.`
	return `You chose ${racerName(pick)}. ${racerName(card.best)} suits this job best.`
}

/**
 * Level 6: for each card, what Jev, the LLM and Code really did, with the
 * user's pick marked. `outcomesFor` gives a card's results: recorded or live.
 */
export function RouterResults({
	cards,
	stages,
	assignments,
	outcomesFor,
	label = 'Results for each card'
}: {
	cards: RouterCard[]
	stages: LevelStage[]
	assignments: Assignments
	outcomesFor: (stage: LevelStage) => ToolOutcome[]
	label?: string
}) {
	return (
		<ol className="flex flex-col gap-4" aria-label={label}>
			{cards.map((card) => {
				const stage = stages.find((candidate) => candidate.task.id === card.taskId)
				if (!stage) return null
				const pick = assignments[card.taskId]
				return (
					<li
						key={card.taskId}
						className="bg-surface border-border shadow-card flex flex-col gap-3 rounded-lg border p-4"
					>
						<h4 className="text-text font-bold">{card.title}</h4>
						<p className="text-text-muted text-sm">
							{verdictText(card, pick)} {card.why}
						</p>
						<div className="grid gap-3 sm:grid-cols-3">
							{outcomesFor(stage).map((outcome) => (
								<ToolResult key={outcome.tool} outcome={outcome} chosen={pick === outcome.tool} />
							))}
						</div>
					</li>
				)
			})}
		</ol>
	)
}
