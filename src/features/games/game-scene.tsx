'use client'

import { m } from 'motion/react'
import { SuccessIcon, WrongIcon } from '@/components/ui/icons'
import type { Game } from '@/content/game-schema'
import type { Task } from '@/content/task-schema'
import { answerText } from '@/features/race/answer-text'
import type { RaceState, RacerState } from '@/features/race/race-state'
import { racerName } from '@/features/race/racer-names'
import { RACER_STYLE } from '@/features/race/racer-style'
import { cn } from '@/lib/cn'
import { GAME_ANIMATIONS, RACERS, type Racer } from '@/lib/constants'

const PERCENT = 100
const CENTER = 50
const SCENE_RACERS: readonly Racer[] = [RACERS.jev, RACERS.llm]

function Chip({
	racer,
	index,
	state,
	animation
}: {
	racer: Racer
	index: number
	state: RacerState
	animation: Game['animation']
}) {
	const result = state.results[index]
	if (!result) {
		return <span aria-hidden className="border-border size-8 rounded border border-dashed" />
	}
	const answer = answerText(racer, result)
	let label = String(index + 1)
	if ((animation === GAME_ANIMATIONS.gate || animation === GAME_ANIMATIONS.runners) && answer) {
		label = answer
	}
	if (animation === GAME_ANIMATIONS.lines) label = `Doc ${index + 1}`
	if (animation === GAME_ANIMATIONS.belts) label = `Pair ${index + 1}`
	if (animation === GAME_ANIMATIONS.checkpoint) label = `Claim ${index + 1}`
	if (animation === GAME_ANIMATIONS.fall && answer) label = answer
	const right = result.correct === true
	return (
		<m.span
			initial={{ scale: 0.4, opacity: 0 }}
			animate={{ scale: 1, opacity: 1 }}
			className={cn(
				'text-text bg-surface flex min-h-8 items-center gap-1 rounded border px-1.5 text-xs font-medium',
				right ? 'border-success' : 'border-danger'
			)}
			title={answer ?? "Couldn't parse"}
		>
			{right ? (
				<SuccessIcon className="text-success" size={14} />
			) : (
				<WrongIcon className="text-danger" size={14} />
			)}
			{label}
			<span className="sr-only">{right ? 'right' : 'wrong'}</span>
		</m.span>
	)
}

function Rope({ perRacer, itemsTotal }: { perRacer: RaceState; itemsTotal: number }) {
	const lead =
		(perRacer[RACERS.jev]?.progress.correct ?? 0) - (perRacer[RACERS.llm]?.progress.correct ?? 0)
	const position = Math.max(0, Math.min(PERCENT, CENTER + (lead / itemsTotal) * CENTER))
	return (
		<div className="flex flex-col gap-1">
			<div className="bg-border relative h-3 rounded-full">
				<m.div
					className="bg-accent absolute top-1/2 size-6 -translate-x-1/2 -translate-y-1/2 rounded-full"
					animate={{ left: `${PERCENT - position}%` }}
				/>
			</div>
			<div className="text-text-muted flex justify-between text-xs">
				<span>Jev pulls this way</span>
				<span>The LLM pulls this way</span>
			</div>
		</div>
	)
}

/** A game's animation, drawn only from the race's live state: one chip or rope position per finished call. */
export function GameScene({
	game,
	task,
	perRacer
}: {
	game: Game
	task: Task
	perRacer: RaceState
}) {
	const itemsTotal = task.items.length
	return (
		<div
			role="img"
			aria-label={`${game.title} scene: ${game.blurb}`}
			className="bg-surface border-border shadow-card flex flex-col gap-3 rounded-lg border p-4"
		>
			{game.animation === GAME_ANIMATIONS.rope ? (
				<Rope perRacer={perRacer} itemsTotal={itemsTotal} />
			) : (
				SCENE_RACERS.map((racer) => {
					const state = perRacer[racer]
					if (!state) return null
					return (
						<div key={racer} className="flex flex-wrap items-center gap-1.5">
							<span className={cn('w-20 shrink-0 text-sm font-bold', RACER_STYLE[racer].text)}>
								{racerName(racer)}
							</span>
							{Array.from({ length: itemsTotal }, (_, index) => (
								<Chip
									key={index}
									racer={racer}
									index={index}
									state={state}
									animation={game.animation}
								/>
							))}
						</div>
					)
				})
			)}
		</div>
	)
}
