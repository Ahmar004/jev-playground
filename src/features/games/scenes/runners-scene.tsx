'use client'

import { m } from 'motion/react'
import { SuccessIcon, WrongIcon } from '@/components/ui/icons'
import type { Game } from '@/content/game-schema'
import type { Task } from '@/content/task-schema'
import type { RaceState, RacerState } from '@/features/race/race-state'
import { racerName } from '@/features/race/racer-names'
import { RACER_STYLE } from '@/features/race/racer-style'
import { cn } from '@/lib/cn'
import { RACERS, type Racer } from '@/lib/constants'
import { RacerBadge, SceneFrame } from './scene-frame'
import { choiceOptions, decisionOf, itemText, optionLabel } from './scene-data'

const LANE_RACERS: readonly Racer[] = [RACERS.jev, RACERS.llm]
const ARRIVE_FROM_PX = -42

type Routed = {
	index: number
	text: string
	device: string | null
	right: boolean
	shouldBe: string
}

function routed(task: Task, racer: Racer, state: RacerState | undefined): Routed[] {
	return (state?.results ?? []).flatMap((result): Routed[] => {
		const index = task.items.findIndex((item) => item.id === result.itemId)
		const item = task.items[index]
		if (!item) return []
		return [
			{
				index,
				text: itemText(item.state),
				device: decisionOf(racer, result),
				right: result.correct === true,
				shouldBe: typeof item.label === 'string' ? item.label : ''
			}
		]
	})
}

function Command({ command }: { command: Routed }) {
	return (
		<span
			className={cn(
				'text-text bg-surface flex min-h-7 items-center gap-0.5 rounded border px-1 text-xs font-medium',
				command.right ? 'border-success' : 'border-danger'
			)}
			title={command.text}
		>
			{command.right ? (
				<SuccessIcon className="text-success" size={12} />
			) : (
				<WrongIcon className="text-danger" size={12} />
			)}
			{command.index + 1}
			<span className="sr-only">
				{`Command ${command.index + 1}, ${command.text}, sent to ${command.device ?? 'no device'}, ${command.right ? 'right' : 'wrong'}`}
			</span>
		</span>
	)
}

function Lane({
	racer,
	task,
	devices,
	state
}: {
	racer: Racer
	task: Task
	devices: string[]
	state: RacerState | undefined
}) {
	const commands = routed(task, racer, state)
	const latest = commands.at(-1)
	const rightCount = commands.filter((command) => command.right).length
	const Runner = RACER_STYLE[racer].icons[0]
	return (
		<section aria-label={`${racerName(racer)} runs the house`} className="flex flex-col gap-2">
			<div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
				<RacerBadge racer={racer} />
				<span className="text-text-muted text-sm">{`${rightCount} of ${commands.length} commands reached the right device`}</span>
			</div>
			<div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
				{devices.map((device) => {
					const here = commands.filter((command) => command.device === device)
					const arrivedHere = latest?.device === device
					return (
						<div
							key={device}
							className={cn(
								'border-border bg-surface-hover flex min-h-20 flex-col gap-1.5 rounded border p-2',
								arrivedHere && 'border-border-strong border-2'
							)}
						>
							<span className="text-text flex items-center justify-between gap-1 text-sm font-semibold">
								{optionLabel(device)}
								{arrivedHere && Runner && (
									<m.span
										key={latest.index}
										initial={{ x: ARRIVE_FROM_PX, opacity: 0 }}
										animate={{ x: 0, opacity: 1 }}
										className={cn('flex rounded-full p-1 text-white', RACER_STYLE[racer].fill)}
									>
										<Runner size={16} />
									</m.span>
								)}
							</span>
							<div className="flex flex-wrap gap-1">
								{here.map((command) => (
									<Command key={command.index} command={command} />
								))}
							</div>
						</div>
					)
				})}
			</div>
			{latest && (
				<p className="text-text-muted line-clamp-2 text-sm">
					{`Latest: "${latest.text}" went to ${latest.device ? optionLabel(latest.device) : 'no device'}${latest.right || !latest.shouldBe ? '' : `, it needed ${optionLabel(latest.shouldBe)}`}.`}
				</p>
			)}
		</section>
	)
}

/** Smart Home Dash: each racer is a runner that reaches the device it routed every command to. */
export function RunnersScene({
	game,
	task,
	perRacer
}: {
	game: Game
	task: Task
	perRacer: RaceState
}) {
	const devices = choiceOptions(task)
	return (
		<SceneFrame label={`${game.title} scene: ${game.blurb}`}>
			{LANE_RACERS.map((racer) => (
				<Lane key={racer} racer={racer} task={task} devices={devices} state={perRacer[racer]} />
			))}
		</SceneFrame>
	)
}
