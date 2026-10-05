import { ChevronRightIcon, InfoIcon } from '@/components/ui/icons'
import type { ItemWords } from '@/content/game-schema'
import type { Task, TaskItem } from '@/content/task-schema'
import { itemOutcome } from '@/features/race/answer-text'
import type { RaceState } from '@/features/race/race-state'
import { OUTCOME_COPY } from '@/features/levels/item-results'
import { cn } from '@/lib/cn'
import { RACERS, type Racer } from '@/lib/constants'
import type { ItemResult } from '@/runner/types'
import { answerLabel, answerValue, jevNote, stateParts } from './item-view'
import { RacerBadge } from './scenes/scene-frame'

type Column = { racer: Racer; results: readonly ItemResult[] }

function AnswerCell({
	words,
	task,
	racer,
	result
}: {
	words: ItemWords
	task: Task
	racer: Racer
	result: ItemResult | undefined
}) {
	if (!result) {
		return (
			<div className="flex flex-col gap-1 text-sm">
				<RacerBadge racer={racer} />
				<p className="text-text-muted">Not answered yet</p>
			</div>
		)
	}
	const copy = OUTCOME_COPY[itemOutcome(result)]
	const value = answerValue(task, racer, result)
	const note = jevNote(task, racer, result)
	return (
		<div className="flex flex-col gap-1 text-sm">
			<RacerBadge racer={racer} />
			<p className="text-text">
				{value === null ? 'No valid answer' : answerLabel(words, task, value)}
				{note !== null && <span className="text-text-muted">{` (${note})`}</span>}
			</p>
			<p className={cn('inline-flex items-center gap-1 font-bold', copy.tone)}>
				<copy.Icon />
				{copy.text}
			</p>
			{value === null && result.raw !== '' && (
				<p className="bg-surface-hover text-text rounded p-2 font-mono text-xs break-words whitespace-pre-wrap">
					{result.raw}
				</p>
			)}
		</div>
	)
}

export function ItemInput({ item }: { item: TaskItem }) {
	const parts = stateParts(item.state)
	const numbered = parts.length > 1 && parts.every((part) => /^\d+$/.test(part.name ?? ''))
	if (numbered) {
		return (
			<ol className="text-text flex flex-col gap-0.5 text-sm">
				{parts.map((part) => (
					<li key={part.name} className="flex gap-2">
						<span className="text-text-muted w-6 shrink-0 text-right tabular-nums">
							{part.name}
						</span>
						{part.text}
					</li>
				))}
			</ol>
		)
	}
	return (
		<div className="flex flex-col gap-1">
			{parts.map((part, index) => (
				<p key={index} className="text-text">
					{part.name !== null && (
						<span className="text-text-muted mr-1 font-bold">{part.name}:</span>
					)}
					{part.text}
				</p>
			))}
		</div>
	)
}

/**
 * Every item of a game with its right answer and what each racer answered, filled in as
 * calls finish: the messages, problems or claims the scene only hints at. Answers that did
 * not parse show their raw output (R44), as plain text (R86).
 */
export function GameItems({
	words,
	task,
	perRacer,
	code
}: {
	words: ItemWords
	task: Task
	perRacer: RaceState
	// Code's answers once it has run (games with a Code racer), else null.
	code: readonly ItemResult[] | null
}) {
	const columns: Column[] = [RACERS.jev, RACERS.llm].flatMap((racer) => {
		const state = perRacer[racer]
		return state ? [{ racer, results: state.results }] : []
	})
	if (code) columns.push({ racer: RACERS.code, results: code })
	const plural = words.plural
	return (
		<details className="group bg-surface border-border shadow-card rounded-lg border p-4">
			<summary className="text-text focus-visible:outline-accent flex cursor-pointer list-none flex-wrap items-center justify-between gap-x-4 gap-y-1 rounded focus-visible:outline focus-visible:outline-2 [&::-webkit-details-marker]:hidden">
				<span className="inline-flex items-center gap-2 font-bold">
					<ChevronRightIcon className="group-open:rotate-90 motion-safe:transition-transform" />
					{`See all ${task.items.length} ${plural} and every answer`}
				</span>
				<span className="text-text-muted inline-flex items-center gap-1 text-sm">
					<InfoIcon />
					{`Open this to see each of the ${plural}, its right answer and what each racer replied.`}
				</span>
			</summary>
			<ol className="mt-4 flex flex-col gap-4">
				{task.items.map((item, index) => (
					<li key={item.id} className="border-border flex flex-col gap-3 border-t pt-4">
						<div className="flex gap-2">
							<span className="text-text-muted font-bold">{index + 1}.</span>
							<ItemInput item={item} />
						</div>
						<p className="text-text-muted text-sm">
							Right answer:{' '}
							<span className="text-text font-bold">
								{item.label === undefined ? 'not scored' : answerLabel(words, task, item.label)}
							</span>
						</p>
						<div
							className={cn('grid gap-4 sm:grid-cols-2', columns.length > 2 && 'lg:grid-cols-3')}
						>
							{columns.map((column) => (
								<AnswerCell
									key={column.racer}
									words={words}
									task={task}
									racer={column.racer}
									result={column.results.find((result) => result.itemId === item.id)}
								/>
							))}
						</div>
					</li>
				))}
			</ol>
		</details>
	)
}
