'use client'

import { m } from 'motion/react'
import type { Game } from '@/content/game-schema'
import type { Task } from '@/content/task-schema'
import type { RaceState, RacerState } from '@/features/race/race-state'
import { racerName } from '@/features/race/racer-names'
import { RACERS, type Racer } from '@/lib/constants'
import {
	ArenaLane,
	ArenaLanes,
	PlayMarks,
	RACER_SVG,
	ReplayBar,
	Stage,
	playKey,
	shortText,
	shownPlay,
	useReplay,
	type Replay
} from './arena-kit'
import {
	TAG_CALLS,
	fanOutKeys,
	plays,
	tagCalls,
	tagChances,
	tagsOf,
	type TagCall
} from './play-data'
import { SceneFrame } from './scene-frame'
import { itemText, optionLabel } from './scene-data'

const LANE_RACERS: readonly Racer[] = [RACERS.jev, RACERS.llm]
const NOUN = 'round'
const PERCENT = 100

const WIDTH = 320
const HEIGHT = 200
const RIM_Y = 62
const RIM_RX = 17
const NET_DEPTH = 20
const THROWER = { x: 160, y: 182 }
const THROW_S = 0.55
const STAGGER_S = 0.12
const ARC_LIFT = 70
const BOUNCE_X = 26

const CALL_WORD: Record<TagCall, string> = {
	[TAG_CALLS.swish]: 'Swish',
	[TAG_CALLS.rimOut]: 'Rim out',
	[TAG_CALLS.missed]: 'Missed',
	[TAG_CALLS.pass]: 'Right no'
}
const CALL_TONE: Record<TagCall, string> = {
	[TAG_CALLS.swish]: 'fill-success',
	[TAG_CALLS.rimOut]: 'fill-danger',
	[TAG_CALLS.missed]: 'fill-danger',
	[TAG_CALLS.pass]: 'fill-text-muted'
}

function hoopX(count: number, index: number): number {
	return (WIDTH / count) * (index + 0.5)
}

function Hoop({ x, label }: { x: number; label: string }) {
	return (
		<g>
			<rect
				x={x - 22}
				y={RIM_Y - 34}
				width={44}
				height={30}
				rx={3}
				strokeWidth={2}
				className="fill-surface stroke-border-strong"
			/>
			<rect
				x={x - 9}
				y={RIM_Y - 22}
				width={18}
				height={14}
				strokeWidth={1.5}
				fill="none"
				className="stroke-border-strong"
			/>
			{[-12, -4, 4, 12].map((dx) => (
				<line
					key={dx}
					x1={x + dx}
					y1={RIM_Y}
					x2={x + dx / 2}
					y2={RIM_Y + NET_DEPTH}
					className="stroke-border-strong"
				/>
			))}
			<ellipse
				cx={x}
				cy={RIM_Y}
				rx={RIM_RX}
				ry={4}
				fill="none"
				strokeWidth={3}
				className="stroke-warning"
			/>
			<text
				x={x}
				y={RIM_Y + 36}
				textAnchor="middle"
				fontSize={10}
				fontWeight={800}
				className="fill-text"
			>
				{label}
			</text>
		</g>
	)
}

function Throw({
	x,
	call,
	racer,
	delay
}: {
	x: number
	call: TagCall
	racer: Racer
	delay: number
}) {
	if (call === TAG_CALLS.pass) return null
	if (call === TAG_CALLS.missed) {
		return (
			<m.circle
				cx={x}
				cy={RIM_Y - 8}
				r={7}
				fill="none"
				strokeWidth={2}
				strokeDasharray="3 3"
				className="stroke-danger"
				initial={{ opacity: 0 }}
				animate={{ opacity: 1 }}
				transition={{ delay: delay + THROW_S }}
			/>
		)
	}
	const swish = call === TAG_CALLS.swish
	const peak = RIM_Y - ARC_LIFT
	const mid = (THROWER.x + x) / 2
	return (
		<m.circle
			r={7}
			className={RACER_SVG[racer].fill}
			initial={{ cx: THROWER.x, cy: THROWER.y }}
			animate={{
				cx: swish ? [THROWER.x, mid, x, x] : [THROWER.x, mid, x, x + BOUNCE_X],
				cy: swish
					? [THROWER.y, peak, RIM_Y - 6, RIM_Y + NET_DEPTH]
					: [THROWER.y, peak, RIM_Y - 8, RIM_Y + 30]
			}}
			transition={{ delay, duration: THROW_S, ease: 'easeOut' }}
		/>
	)
}

function HoopsLane({
	racer,
	task,
	state,
	replay
}: {
	racer: Racer
	task: Task
	state: RacerState | undefined
	replay: Replay
}) {
	const keys = fanOutKeys(task)
	const list = plays(task, state)
	const rightTags = list.reduce((sum, play) => {
		const tags = tagsOf(racer, play.result)
		const calls = tags ? Object.values(tagCalls(play.item, tags)) : []
		return sum + calls.filter((call) => call === TAG_CALLS.swish || call === TAG_CALLS.pass).length
	}, 0)
	const shown = shownPlay(list, replay.picked)
	const busy = (state?.inFlight ?? 0) > 0 && replay.picked === null
	const name = racerName(racer)

	const tags = shown ? tagsOf(racer, shown.result) : null
	const calls = shown && tags ? tagCalls(shown.item, tags) : null
	const chances = shown ? tagChances(racer, shown.result) : null

	let caption: string | null = null
	if (shown) {
		const head = `Round ${shown.index + 1}: "${shortText(itemText(shown.item.state))}".`
		if (!calls) {
			caption = `${head} ${name} gave no valid answer, so it threw nothing.`
		} else {
			const right = Object.values(calls).filter(
				(call) => call === TAG_CALLS.swish || call === TAG_CALLS.pass
			).length
			const yes = keys.filter((key) => tags?.[key] === true).map(optionLabel)
			caption = `${head} ${name} threw at ${yes.length > 0 ? yes.join(', ') : 'no hoop'}: ${right} of ${keys.length} hoops right.`
		}
	}

	return (
		<ArenaLane
			racer={racer}
			label="at the hoops"
			tally={`Hoops right ${rightTags} of ${keys.length * task.items.length}`}
			thinking={busy}
			caption={caption}
		>
			<Stage width={WIDTH} height={HEIGHT}>
				<rect width={WIDTH} height={HEIGHT} className="fill-surface-hover/60" />
				{keys.map((key, index) => (
					<Hoop key={key} x={hoopX(keys.length, index)} label={optionLabel(key)} />
				))}
				<circle cx={THROWER.x} cy={THROWER.y - 4} r={9} className={RACER_SVG[racer].fill} />
				{shown && (
					<g key={playKey(shown, replay)}>
						{calls ? (
							keys.map((key, index) => {
								const call = calls[key]
								if (!call) return null
								const x = hoopX(keys.length, index)
								const chance = chances?.[key]
								return (
									<g key={key}>
										<Throw x={x} call={call} racer={racer} delay={index * STAGGER_S} />
										<m.text
											x={x}
											y={RIM_Y + 50}
											textAnchor="middle"
											fontSize={10}
											fontWeight={800}
											className={CALL_TONE[call]}
											initial={{ opacity: 0 }}
											animate={{ opacity: 1 }}
											transition={{ delay: index * STAGGER_S + THROW_S }}
										>
											{CALL_WORD[call]}
										</m.text>
										{chance !== undefined && (
											<text
												x={x}
												y={RIM_Y + 62}
												textAnchor="middle"
												fontSize={9}
												className="fill-text-muted"
											>
												{`${Math.round(chance * PERCENT)}% yes`}
											</text>
										)}
									</g>
								)
							})
						) : (
							<text
								x={THROWER.x}
								y={THROWER.y - 18}
								textAnchor="middle"
								fontSize={14}
								fontWeight={800}
								className="fill-warning"
							>
								?
							</text>
						)}
					</g>
				)}
			</Stage>
			<PlayMarks task={task} racer={racer} state={state} noun={NOUN} replay={replay} />
		</ArenaLane>
	)
}

/** Carnival Hoops: every email is a round, and each racer throws a ball into every hoop it answers yes for. */
export function HoopsScene({
	game,
	task,
	perRacer
}: {
	game: Game
	task: Task
	perRacer: RaceState
}) {
	const replay = useReplay()
	return (
		<SceneFrame label={`${game.title} scene: ${game.blurb}`}>
			<ReplayBar noun={NOUN} replay={replay} />
			<ArenaLanes count={2}>
				{LANE_RACERS.map((racer) => (
					<HoopsLane
						key={racer}
						racer={racer}
						task={task}
						state={perRacer[racer]}
						replay={replay}
					/>
				))}
			</ArenaLanes>
		</SceneFrame>
	)
}
