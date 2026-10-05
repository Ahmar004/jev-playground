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
	toneOf,
	useReplay,
	type Replay
} from './arena-kit'
import { plays } from './play-data'
import { SceneFrame } from './scene-frame'
import { choiceOptions, decisionOf, itemText, optionLabel } from './scene-data'

const LANE_RACERS: readonly Racer[] = [RACERS.jev, RACERS.llm]
const NOUN = 'kick'

// The pitch, in SVG units.
const WIDTH = 320
const HEIGHT = 200
const GOAL = { left: 40, top: 26, width: 240, height: 84 }
const NET_GAP = 12
const SPOT = { x: 160, y: 182 }
const BALL_Y = 66
const KEEPER_Y = 82
const SWAY = 8
const DIVE_DEGREES = 70
const JUMP = 14
const FLIGHT_S = 0.45
const SWAY_S = 0.9
const VERDICT_Y = 146

function zoneCenter(zones: readonly string[], option: string | null): number | null {
	const index = option === null ? -1 : zones.indexOf(option)
	if (index === -1) return null
	const zoneWidth = GOAL.width / zones.length
	return GOAL.left + zoneWidth * index + zoneWidth / 2
}

/** The email's subject line, which a caption can show in full; else the start of its text. */
export function emailSubject(text: string): string {
	const subject = /^Subject:\s*(.+)$/m.exec(text)?.[1]
	return shortText(subject ?? text)
}

function Goal({ zones, right }: { zones: readonly string[]; right: string | null }) {
	const zoneWidth = GOAL.width / zones.length
	const netX = Array.from(
		{ length: Math.floor(GOAL.width / NET_GAP) },
		(_, n) => GOAL.left + n * NET_GAP
	)
	const netY = Array.from(
		{ length: Math.floor(GOAL.height / NET_GAP) },
		(_, n) => GOAL.top + n * NET_GAP
	)
	return (
		<g>
			{zones.map((zone, index) => (
				<rect
					key={zone}
					x={GOAL.left + zoneWidth * index}
					y={GOAL.top}
					width={zoneWidth}
					height={GOAL.height}
					className={zone === right ? 'fill-success/15' : 'fill-transparent'}
				/>
			))}
			{netX.map((x) => (
				<line
					key={`x${x}`}
					x1={x}
					x2={x}
					y1={GOAL.top}
					y2={GOAL.top + GOAL.height}
					className="stroke-border"
				/>
			))}
			{netY.map((y) => (
				<line
					key={`y${y}`}
					x1={GOAL.left}
					x2={GOAL.left + GOAL.width}
					y1={y}
					y2={y}
					className="stroke-border"
				/>
			))}
			{zones.slice(1).map((zone, index) => (
				<line
					key={zone}
					x1={GOAL.left + zoneWidth * (index + 1)}
					x2={GOAL.left + zoneWidth * (index + 1)}
					y1={GOAL.top}
					y2={GOAL.top + GOAL.height}
					strokeDasharray="4 4"
					strokeWidth={2}
					className="stroke-border-strong"
				/>
			))}
			{zones.map((zone, index) => (
				<text
					key={zone}
					x={GOAL.left + zoneWidth * index + zoneWidth / 2}
					y={GOAL.top + 14}
					textAnchor="middle"
					fontSize={11}
					fontWeight={800}
					className="fill-text-muted"
				>
					{optionLabel(zone).toUpperCase()}
				</text>
			))}
			<path
				d={`M${GOAL.left} ${GOAL.top + GOAL.height} V${GOAL.top} H${GOAL.left + GOAL.width} V${GOAL.top + GOAL.height}`}
				fill="none"
				strokeWidth={5}
				strokeLinejoin="round"
				className="stroke-text"
			/>
			<line
				x1={0}
				x2={WIDTH}
				y1={GOAL.top + GOAL.height}
				y2={GOAL.top + GOAL.height}
				className="stroke-border-strong"
			/>
			<circle cx={SPOT.x} cy={SPOT.y} r={2.5} className="fill-border-strong" />
		</g>
	)
}

function Keeper({ racer }: { racer: Racer }) {
	return (
		<g>
			<circle cx={0} cy={-20} r={7} className={RACER_SVG[racer].fill} />
			<rect x={-8} y={-12} width={16} height={22} rx={5} className={RACER_SVG[racer].fill} />
			<line
				x1={-8}
				y1={-8}
				x2={-18}
				y2={-18}
				strokeWidth={4}
				strokeLinecap="round"
				className={RACER_SVG[racer].stroke}
			/>
			<line
				x1={8}
				y1={-8}
				x2={18}
				y2={-18}
				strokeWidth={4}
				strokeLinecap="round"
				className={RACER_SVG[racer].stroke}
			/>
		</g>
	)
}

function PenaltyLane({
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
	const zones = choiceOptions(task)
	const list = plays(task, state)
	const saves = list.filter((play) => play.result.correct === true).length
	const shown = shownPlay(list, replay.picked)
	const busy = (state?.inFlight ?? 0) > 0 && replay.picked === null
	const name = racerName(racer)

	const right = typeof shown?.item.label === 'string' ? shown.item.label : null
	const dove = shown ? decisionOf(racer, shown.result) : null
	const diveX = zoneCenter(zones, dove)
	const ballX = zoneCenter(zones, right) ?? SPOT.x
	const center = WIDTH / 2
	const tone = shown ? toneOf(shown.result) : null
	const saved = shown?.result.correct === true
	const verdict = !shown ? null : diveX === null ? 'NO DIVE' : saved ? 'SAVED' : 'GOAL'
	const rotate =
		diveX === null || diveX === center ? 0 : diveX < center ? -DIVE_DEGREES : DIVE_DEGREES

	let caption: string | null = null
	if (shown) {
		const kick = `Kick ${shown.index + 1}: "${emailSubject(itemText(shown.item.state))}" was ${right ? optionLabel(right) : 'unlabelled'}.`
		caption =
			dove === null
				? `${kick} ${name} gave no valid answer, so it never dived: goal.`
				: `${kick} ${name} dived to ${optionLabel(dove)}: ${saved ? 'saved' : 'goal'}.`
	}

	return (
		<ArenaLane
			racer={racer}
			label="in goal"
			tally={`Saves ${saves} of ${task.items.length}`}
			thinking={busy}
			caption={caption}
		>
			<Stage width={WIDTH} height={HEIGHT}>
				<rect width={WIDTH} height={HEIGHT} className="fill-surface-hover/60" />
				<Goal zones={zones} right={shown ? right : null} />
				{shown ? (
					<g key={playKey(shown, replay)}>
						<m.g
							initial={{ x: center, y: KEEPER_Y, rotate: 0 }}
							animate={{
								x: diveX ?? center,
								y: diveX === center ? KEEPER_Y - JUMP : KEEPER_Y,
								rotate
							}}
							transition={{ duration: FLIGHT_S, ease: 'easeOut' }}
							style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
						>
							<Keeper racer={racer} />
						</m.g>
						{dove === null && (
							<text
								x={center}
								y={KEEPER_Y - 34}
								textAnchor="middle"
								fontSize={18}
								fontWeight={800}
								className="fill-warning"
							>
								?
							</text>
						)}
						<m.circle
							r={6}
							initial={{ cx: SPOT.x, cy: SPOT.y }}
							animate={{ cx: ballX, cy: BALL_Y }}
							transition={{ duration: FLIGHT_S, ease: 'easeIn' }}
							strokeWidth={2}
							className="fill-surface stroke-text"
						/>
						<m.text
							x={center}
							y={VERDICT_Y}
							textAnchor="middle"
							fontSize={24}
							fontWeight={900}
							initial={{ opacity: 0, scale: 0.6 }}
							animate={{ opacity: 1, scale: 1 }}
							transition={{ delay: FLIGHT_S, duration: FLIGHT_S / 2 }}
							style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
							className={tone?.fill}
						>
							{verdict}
						</m.text>
					</g>
				) : (
					<m.g
						initial={{ x: center, y: KEEPER_Y }}
						animate={{
							x: busy ? [center - SWAY, center + SWAY, center - SWAY] : center,
							y: KEEPER_Y
						}}
						transition={{ duration: SWAY_S, repeat: busy ? Infinity : 0 }}
					>
						<Keeper racer={racer} />
					</m.g>
				)}
			</Stage>
			<PlayMarks task={task} racer={racer} state={state} noun={NOUN} replay={replay} />
		</ArenaLane>
	)
}

/** Inbox Keeper: every email is a penalty kick into the zone of its right answer, and each keeper dives to the zone it chose. */
export function PenaltyScene({
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
					<PenaltyLane
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
