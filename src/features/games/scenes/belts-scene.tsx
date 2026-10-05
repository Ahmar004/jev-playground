'use client'

import { m } from 'motion/react'
import { SuccessIcon, WrongIcon } from '@/components/ui/icons'
import type { Game } from '@/content/game-schema'
import type { Task, TaskItem } from '@/content/task-schema'
import type { RaceState, RacerState } from '@/features/race/race-state'
import { racerName } from '@/features/race/racer-names'
import { cn } from '@/lib/cn'
import { RACERS, type Racer } from '@/lib/constants'
import { RacerBadge, SceneFrame } from './scene-frame'
import { checkTally, latestResult, noulOf, resultForItem, yesOf } from './scene-data'

const LANE_RACERS: readonly Racer[] = [RACERS.jev, RACERS.llm]
const PERCENT = 100
const STAMP_FROM_SCALE = 1.8

/** The two listings of a pair, or null when the item is not a pair of shop listings. */
function listings(item: TaskItem): { shopA: string; shopB: string } | null {
	const { state } = item
	if (typeof state !== 'object' || Array.isArray(state)) return null
	const { shopA, shopB } = state
	return typeof shopA === 'string' && typeof shopB === 'string' ? { shopA, shopB } : null
}

function Belt({ name, text }: { name: string; text: string }) {
	return (
		<div className="border-border bg-surface-hover flex flex-1 flex-col gap-1 rounded border border-b-4 p-2">
			<span className="text-text-muted text-xs font-semibold uppercase">{name}</span>
			<span className="text-text text-sm">{text}</span>
		</div>
	)
}

function Tile({
	racer,
	item,
	index,
	state
}: {
	racer: Racer
	item: TaskItem
	index: number
	state: RacerState | undefined
}) {
	const result = resultForItem(state, item.id)
	if (!result) {
		return <span aria-hidden className="border-border size-8 rounded border border-dashed" />
	}
	const said = yesOf(racer, result)
	const right = result.correct === true
	return (
		<m.span
			initial={{ scale: STAMP_FROM_SCALE, opacity: 0 }}
			animate={{ scale: 1, opacity: 1 }}
			className={cn(
				'text-text bg-surface flex min-h-8 items-center gap-1 rounded border px-1.5 text-xs font-medium',
				right ? 'border-success' : 'border-danger'
			)}
		>
			{right ? (
				<SuccessIcon className="text-success" size={14} />
			) : (
				<WrongIcon className="text-danger" size={14} />
			)}
			{index + 1}
			{said === null ? '?' : said ? '=' : '≠'}
			<span className="sr-only">
				{`Pair ${index + 1}, stamped ${said === null ? "couldn't parse" : said ? 'same' : 'different'}, ${right ? 'right' : 'wrong'}`}
			</span>
		</m.span>
	)
}

function Lane({ racer, task, state }: { racer: Racer; task: Task; state: RacerState | undefined }) {
	const tally = checkTally(task, state, racer)
	const latest = latestResult(state)
	const item = task.items.find((candidate) => candidate.id === latest?.itemId)
	const pair = item ? listings(item) : null
	const said = latest ? yesOf(racer, latest) : null
	const probability = latest ? noulOf(racer, latest) : null
	const right = latest?.correct === true
	return (
		<section aria-label={`${racerName(racer)} at the belts`} className="flex flex-col gap-2">
			<div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
				<RacerBadge racer={racer} />
				<span className="text-text-muted text-sm">
					{`Different pairs caught ${tally.caught} of ${tally.bad}`}
					{tally.falseAlarms > 0 && (
						<span className="text-danger font-semibold">{` - ${tally.falseAlarms} false alarms`}</span>
					)}
				</span>
			</div>
			{item && pair && latest && (
				<m.div
					key={item.id}
					initial={{ x: -24, opacity: 0 }}
					animate={{ x: 0, opacity: 1 }}
					className="flex flex-col gap-2"
				>
					<div className="flex flex-col gap-2 sm:flex-row">
						<Belt name="Shop A" text={pair.shopA} />
						<Belt name="Shop B" text={pair.shopB} />
					</div>
					<p
						className={cn(
							'flex items-center gap-1.5 text-sm font-semibold',
							right ? 'text-success' : 'text-danger'
						)}
					>
						{right ? <SuccessIcon size={16} /> : <WrongIcon size={16} />}
						{said === null
							? "Couldn't parse"
							: `Stamped ${said ? 'same' : 'different'}${probability === null ? '' : ` (${Math.round(probability * PERCENT)}% same)`}`}
						<span className="text-text-muted font-normal">
							{item.label === undefined ? '' : `Right answer: ${item.label ? 'same' : 'different'}`}
						</span>
					</p>
				</m.div>
			)}
			<div className="flex flex-wrap gap-1.5">
				{task.items.map((candidate, index) => (
					<Tile key={candidate.id} racer={racer} item={candidate} index={index} state={state} />
				))}
			</div>
		</section>
	)
}

/** Twin Finder: pairs of shop listings ride two belts and each racer stamps them same or different. */
export function BeltsScene({
	game,
	task,
	perRacer
}: {
	game: Game
	task: Task
	perRacer: RaceState
}) {
	return (
		<SceneFrame label={`${game.title} scene: ${game.blurb}`}>
			{LANE_RACERS.map((racer) => (
				<Lane key={racer} racer={racer} task={task} state={perRacer[racer]} />
			))}
		</SceneFrame>
	)
}
