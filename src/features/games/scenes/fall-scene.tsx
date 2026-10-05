'use client'

import { m } from 'motion/react'
import { SuccessIcon, WrongIcon } from '@/components/ui/icons'
import type { Game } from '@/content/game-schema'
import type { Task } from '@/content/task-schema'
import type { RaceState, RacerState } from '@/features/race/race-state'
import { racerName } from '@/features/race/racer-names'
import { cn } from '@/lib/cn'
import { RACERS, type Racer } from '@/lib/constants'
import { RacerBadge, SceneFrame } from './scene-frame'
import {
	actedOn,
	choiceOptions,
	confidenceOf,
	decisionOf,
	itemText,
	optionLabel
} from './scene-data'

const LANE_RACERS: readonly Racer[] = [RACERS.jev, RACERS.llm]
const PERCENT = 100
const FALL_FROM_PX = -30
const REVIEW_DESK = 'review desk'

type Fruit = {
	index: number
	text: string
	// Where the answer lands: a team, or the review desk when its confidence is under the threshold.
	bin: string | null
	confidence: number | null
	right: boolean
}

function fruitFor(
	task: Task,
	racer: Racer,
	state: RacerState | undefined,
	threshold: number
): Fruit[] {
	return (state?.results ?? []).flatMap((result): Fruit[] => {
		const index = task.items.findIndex((item) => item.id === result.itemId)
		const item = task.items[index]
		if (!item) return []
		const pick = decisionOf(racer, result)
		const confidence = confidenceOf(racer, result)
		return [
			{
				index,
				text: itemText(item.state),
				bin: pick === null ? null : actedOn(confidence, threshold) ? pick : REVIEW_DESK,
				confidence,
				right: result.correct === true
			}
		]
	})
}

function Drop({ fruit }: { fruit: Fruit }) {
	const review = fruit.bin === REVIEW_DESK
	return (
		<m.span
			initial={{ y: FALL_FROM_PX, opacity: 0 }}
			animate={{ y: 0, opacity: 1 }}
			className={cn(
				'text-text bg-surface flex min-h-8 items-center gap-1 rounded border px-1.5 text-xs font-medium',
				review
					? 'border-border-strong border-dashed'
					: fruit.right
						? 'border-success'
						: 'border-danger'
			)}
			title={fruit.text}
		>
			{!review &&
				(fruit.right ? (
					<SuccessIcon className="text-success" size={14} />
				) : (
					<WrongIcon className="text-danger" size={14} />
				))}
			{fruit.index + 1}
			{fruit.confidence !== null && (
				<span className="text-text-muted">{`${Math.round(fruit.confidence * PERCENT)}%`}</span>
			)}
			<span className="sr-only">
				{`Message ${fruit.index + 1}, ${fruit.text}, ${review ? 'sent to a person' : `acted on as ${fruit.bin ?? 'no answer'}`}, ${fruit.right ? 'a right answer' : 'a wrong answer'}`}
			</span>
		</m.span>
	)
}

function Basket({ name, fruit }: { name: string; fruit: Fruit[] }) {
	return (
		<div className="border-border bg-surface-hover flex min-h-16 flex-col gap-1.5 rounded border p-2">
			<span className="text-text-muted flex justify-between text-xs font-semibold uppercase">
				{name}
				<span>{fruit.length}</span>
			</span>
			<div className="flex flex-wrap gap-1.5">
				{fruit.map((drop) => (
					<Drop key={drop.index} fruit={drop} />
				))}
			</div>
		</div>
	)
}

function Lane({
	racer,
	task,
	teams,
	state,
	threshold
}: {
	racer: Racer
	task: Task
	teams: string[]
	state: RacerState | undefined
	threshold: number
}) {
	const fruit = fruitFor(task, racer, state, threshold)
	const hasConfidence = racer === RACERS.jev
	const sent = fruit.filter((drop) => drop.bin === REVIEW_DESK).length
	const acted = fruit.filter((drop) => drop.bin !== REVIEW_DESK && drop.bin !== null)
	const actedWrong = acted.filter((drop) => !drop.right).length
	return (
		<section aria-label={`${racerName(racer)} catches answers`} className="flex flex-col gap-2">
			<div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
				<RacerBadge racer={racer} />
				<span className="text-text-muted text-sm">
					{hasConfidence
						? `${acted.length} acted on, ${actedWrong} of them wrong, ${sent} sent to a person`
						: `${acted.length} acted on, ${actedWrong} of them wrong. It gives no confidence, so all are acted on.`}
				</span>
			</div>
			<div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
				{teams.map((team) => (
					<Basket
						key={team}
						name={optionLabel(team)}
						fruit={fruit.filter((drop) => drop.bin === team)}
					/>
				))}
				{hasConfidence && (
					<Basket
						name="Sent to a person"
						fruit={fruit.filter((drop) => drop.bin === REVIEW_DESK)}
					/>
				)}
			</div>
		</section>
	)
}

/**
 * Confidence Catch: answers fall into the team they were routed to, or onto the review desk when
 * Jev's confidence is under the threshold. The slider below moves the threshold and re-sorts them.
 */
export function FallScene({
	game,
	task,
	perRacer,
	threshold
}: {
	game: Game
	task: Task
	perRacer: RaceState
	threshold: number
}) {
	const teams = choiceOptions(task)
	return (
		<SceneFrame label={`${game.title} scene: ${game.blurb}`}>
			<p className="text-text-muted text-sm">{`Threshold: ${Math.round(threshold * PERCENT)}%. Jev's answers under it go to a person.`}</p>
			{LANE_RACERS.map((racer) => (
				<Lane
					key={racer}
					racer={racer}
					task={task}
					teams={teams}
					state={perRacer[racer]}
					threshold={threshold}
				/>
			))}
		</SceneFrame>
	)
}
