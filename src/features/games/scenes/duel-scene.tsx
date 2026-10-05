'use client'

import { m } from 'motion/react'
import { SuccessIcon, WrongIcon } from '@/components/ui/icons'
import type { Game } from '@/content/game-schema'
import type { Task } from '@/content/task-schema'
import { valueText } from '@/features/race/answer-text'
import type { RaceState, RacerState } from '@/features/race/race-state'
import { racerName } from '@/features/race/racer-names'
import { RACER_STYLE } from '@/features/race/racer-style'
import { cn } from '@/lib/cn'
import { RACERS, type Racer } from '@/lib/constants'
import { RacerBadge, SceneFrame } from './scene-frame'
import { decisionOf, hitPoints, itemText, latestResult } from './scene-data'

const FIGHTERS: readonly Racer[] = [RACERS.jev, RACERS.llm]
const HIT_SHAKE_PX = 4
// A lost segment shakes once; one constant array, so a re-render does not replay it.
const SHAKE = [0, -HIT_SHAKE_PX, HIT_SHAKE_PX, 0]

function HitBar({
	racer,
	state,
	total
}: {
	racer: Racer
	state: RacerState | undefined
	total: number
}) {
	const { left } = hitPoints(state, total)
	return (
		<div
			role="meter"
			aria-label={`${racerName(racer)} hit points`}
			aria-valuemin={0}
			aria-valuemax={total}
			aria-valuenow={left}
			className="flex gap-0.5"
		>
			{Array.from({ length: total }, (_, index) => (
				<m.span
					key={index}
					animate={{ x: index === left ? SHAKE : 0 }}
					className={cn(
						'h-3 flex-1 rounded-sm',
						index < left ? RACER_STYLE[racer].fill : 'bg-border'
					)}
				/>
			))}
		</div>
	)
}

function Round({
	racer,
	task,
	state
}: {
	racer: Racer
	task: Task
	state: RacerState | undefined
}) {
	const result = latestResult(state)
	const item = task.items.find((candidate) => candidate.id === result?.itemId)
	if (!result || !item) {
		const busy = (state?.inFlight ?? 0) > 0
		return (
			<p className="text-text-muted text-sm">
				{busy ? 'Working on it...' : 'Waiting for the bell.'}
			</p>
		)
	}
	const right = result.correct === true
	const answer = decisionOf(racer, result)
	return (
		<m.div
			key={item.id}
			initial={{ opacity: 0, y: 8 }}
			animate={{ opacity: 1, y: 0 }}
			className={cn(
				'bg-surface-hover flex flex-col gap-1 rounded border-2 p-2 text-sm',
				right ? 'border-success' : 'border-danger'
			)}
		>
			<span className="text-text">{itemText(item.state)}</span>
			<span className="flex flex-wrap items-center gap-x-3 gap-y-1">
				<span className="flex items-center gap-1 font-semibold">
					{right ? (
						<SuccessIcon className="text-success" size={16} />
					) : (
						<WrongIcon className="text-danger" size={16} />
					)}
					{answer === null ? "Couldn't parse" : `Answered ${answer}`}
				</span>
				<span className="text-text-muted">
					{item.label === undefined ? '' : `Right answer: ${valueText(item.label)}`}
				</span>
			</span>
		</m.div>
	)
}

/** Number Crunch Showdown: two fighters, one problem per round, and a hit point lost on every miss. */
export function DuelScene({
	game,
	task,
	perRacer
}: {
	game: Game
	task: Task
	perRacer: RaceState
}) {
	const total = task.items.length
	return (
		<SceneFrame label={`${game.title} scene: ${game.blurb}`}>
			<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
				{FIGHTERS.map((racer) => {
					const state = perRacer[racer]
					const { left } = hitPoints(state, total)
					return (
						<section
							key={racer}
							aria-label={`${racerName(racer)} in the duel`}
							className="flex flex-col gap-2"
						>
							<div className="flex items-baseline justify-between gap-2">
								<RacerBadge racer={racer} />
								<span className="text-text-muted text-sm">{`${left} of ${total} hit points`}</span>
							</div>
							<HitBar racer={racer} state={state} total={total} />
							<Round racer={racer} task={task} state={state} />
						</section>
					)
				})}
			</div>
		</SceneFrame>
	)
}
