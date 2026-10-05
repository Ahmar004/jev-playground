'use client'

import { m } from 'motion/react'
import { ShieldCheckIcon, SuccessIcon, WrongIcon } from '@/components/ui/icons'
import type { Game } from '@/content/game-schema'
import type { Task } from '@/content/task-schema'
import type { RaceState, RacerState } from '@/features/race/race-state'
import { racerName } from '@/features/race/racer-names'
import { cn } from '@/lib/cn'
import { GATE_DECISIONS, RACERS, type Racer } from '@/lib/constants'
import { RacerBadge, SceneFrame } from './scene-frame'
import { decisionOf, gateTally, itemText } from './scene-data'

const LANE_RACERS: readonly Racer[] = [RACERS.jev, RACERS.llm]
const BINS = [GATE_DECISIONS.pass, GATE_DECISIONS.review, GATE_DECISIONS.block] as const
const BIN_NAME: Record<(typeof BINS)[number], string> = {
	pass: 'Pass',
	review: 'Review',
	block: 'Block'
}
const RUSH_PX = 10
const RUSH_SECONDS = 0.7
const RUSH_STAGGER_S = 0.07

function binName(decision: string | null): string {
	const bin = BINS.find((candidate) => candidate === decision)
	return bin ? BIN_NAME[bin] : 'no valid answer'
}

type Placed = {
	index: number
	text: string
	decision: string | null
	right: boolean
	// A message that should have been blocked and was not.
	leaked: boolean
}

function placed(task: Task, racer: Racer, state: RacerState | undefined): Placed[] {
	return (state?.results ?? []).flatMap((result): Placed[] => {
		const index = task.items.findIndex((item) => item.id === result.itemId)
		const item = task.items[index]
		if (!item) return []
		const decision = decisionOf(racer, result)
		return [
			{
				index,
				text: itemText(item.state),
				decision,
				right: result.correct === true,
				leaked: item.label === GATE_DECISIONS.block && decision !== GATE_DECISIONS.block
			}
		]
	})
}

function Message({ message }: { message: Placed }) {
	const { right, leaked } = message
	return (
		<m.span
			initial={{ x: -28, opacity: 0 }}
			animate={{ x: 0, opacity: 1 }}
			className={cn(
				'text-text bg-surface flex min-h-8 items-center gap-1 rounded border px-1.5 text-xs font-medium',
				right ? 'border-success' : 'border-danger',
				leaked && 'ring-danger ring-2'
			)}
			title={message.text}
		>
			{right ? (
				<SuccessIcon className="text-success" size={14} />
			) : (
				<WrongIcon className="text-danger" size={14} />
			)}
			{message.index + 1}
			<span className="sr-only">
				{`Message ${message.index + 1}, ${message.text}, ${message.decision ?? "couldn't parse"}, ${right ? 'right' : 'wrong'}${leaked ? ', a threat let through' : ''}`}
			</span>
		</m.span>
	)
}

function Bin({ name, messages }: { name: string; messages: Placed[] }) {
	return (
		<div className="border-border bg-surface-hover flex min-h-16 flex-col gap-1.5 rounded border p-2">
			<span className="text-text-muted flex justify-between text-xs font-semibold uppercase">
				{name}
				<span>{messages.length}</span>
			</span>
			<div className="flex flex-wrap gap-1.5">
				{messages.map((message) => (
					<Message key={message.index} message={message} />
				))}
			</div>
		</div>
	)
}

function GateLane({
	racer,
	task,
	state
}: {
	racer: Racer
	task: Task
	state: RacerState | undefined
}) {
	const tally = gateTally(task, state, racer)
	const messages = placed(task, racer, state)
	const waiting = Math.max(0, task.items.length - tally.decided)
	const rushing = (state?.inFlight ?? 0) > 0
	const latest = messages.at(-1)
	const unanswered = messages.filter((message) => !BINS.some((bin) => bin === message.decision))
	return (
		<section aria-label={`${racerName(racer)} at the gate`} className="flex flex-col gap-2">
			<div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
				<RacerBadge racer={racer} />
				<span className="text-text-muted text-sm">
					Threats stopped {tally.stopped} of {tally.threats}
					{tally.leaked > 0 && (
						<span className="text-danger font-semibold"> - {tally.leaked} let through</span>
					)}
				</span>
			</div>
			<div className="flex items-center gap-2">
				<span className="text-text-muted text-sm">{`Waiting at the gate: ${waiting}`}</span>
				<div className="flex flex-1 flex-wrap justify-end gap-1" aria-hidden>
					{Array.from({ length: waiting }, (_, position) => (
						<m.span
							key={position}
							className="bg-border-strong size-3 rounded-full"
							animate={{ x: rushing ? [0, RUSH_PX, 0] : 0 }}
							transition={{
								duration: RUSH_SECONDS,
								repeat: rushing ? Infinity : 0,
								delay: position * RUSH_STAGGER_S
							}}
						/>
					))}
				</div>
				<ShieldCheckIcon className="text-text-muted" size={30} aria-hidden />
				<span className="bg-border-strong h-9 w-1.5 rounded" aria-hidden />
			</div>
			<div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
				{BINS.map((bin) => (
					<Bin
						key={bin}
						name={BIN_NAME[bin]}
						messages={messages.filter((message) => message.decision === bin)}
					/>
				))}
			</div>
			{unanswered.length > 0 && <Bin name="No valid answer" messages={unanswered} />}
			{latest && (
				<m.p
					key={latest.index}
					initial={{ opacity: 0, y: 6 }}
					animate={{ opacity: 1, y: 0 }}
					className="text-text-muted line-clamp-2 text-sm"
				>
					{`Latest: "${latest.text}" went to ${binName(latest.decision)}.`}
				</m.p>
			)}
		</section>
	)
}

/** Guardrail Gauntlet: messages queue at a gate and each bouncer sends them to Pass, Review or Block. */
export function GateScene({
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
				<GateLane key={racer} racer={racer} task={task} state={perRacer[racer]} />
			))}
		</SceneFrame>
	)
}
