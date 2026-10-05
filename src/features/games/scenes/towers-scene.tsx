'use client'

import { m } from 'motion/react'
import type { Game } from '@/content/game-schema'
import type { Task } from '@/content/task-schema'
import type { RaceState, RacerState } from '@/features/race/race-state'
import { racerName } from '@/features/race/racer-names'
import { RACERS, RETURN_WINDOW_DAYS, type Racer } from '@/lib/constants'
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
import { codeDays, plays, type Play } from './play-data'
import { SceneFrame } from './scene-frame'
import { checkTally, itemText, noulOf, yesOf } from './scene-data'

const LANE_RACERS: readonly Racer[] = [RACERS.jev, RACERS.jevCode, RACERS.llm]
const NOUN = 'return'
const PERCENT = 100

const WIDTH = 320
const HEIGHT = 170
const ROAD = { top: 96, height: 26 }
const TOWER_X = 34
const ZAP_X = 150
const DOOR_X = 262
const PARCEL = 12
// Room between parcels on a pile, so each one stays visible.
const PILE_STEP = 15
const PILE_Y = 150
const STACK_COLUMNS = 3
const WALK_S = 0.8

function Parcel({ x, y, className }: { x: number; y: number; className: string }) {
	return (
		<g transform={`translate(${x} ${y})`}>
			<rect
				x={-PARCEL / 2}
				y={-PARCEL / 2}
				width={PARCEL}
				height={PARCEL}
				rx={2}
				strokeWidth={1.5}
				className={className}
			/>
			<line
				x1={-PARCEL / 2}
				x2={PARCEL / 2}
				y1={0}
				y2={0}
				strokeWidth={1.5}
				className="stroke-surface"
			/>
		</g>
	)
}

/** Where a decided return rests: stacked in the warehouse when let in, on the turned-away pile when stopped. */
function restingSpot(racer: Racer, list: readonly Play[], play: Play) {
	const letIn = yesOf(racer, play.result)
	const group = list.filter((other) => yesOf(racer, other.result) === letIn)
	const n = group.indexOf(play)
	if (letIn === true) {
		return {
			x: DOOR_X + 10 + (n % STACK_COLUMNS) * PILE_STEP,
			y: ROAD.top + 14 - Math.floor(n / STACK_COLUMNS) * PILE_STEP
		}
	}
	return { x: TOWER_X + 40 + n * PILE_STEP, y: PILE_Y }
}

function TowersLane({
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
	const list = plays(task, state)
	const tally = checkTally(task, state, racer)
	const shown = shownPlay(list, replay.picked)
	const busy = (state?.inFlight ?? 0) > 0 && replay.picked === null
	const name = racerName(racer)
	const laneY = ROAD.top + ROAD.height / 2

	const letIn = shown ? yesOf(racer, shown.result) : null
	const days = shown ? codeDays(racer, shown.result) : null
	const chance = shown ? noulOf(racer, shown.result) : null
	const tone = shown ? toneOf(shown.result) : null

	let caption: string | null = null
	if (shown) {
		const late = shown.item.label === false
		const head = `Return ${shown.index + 1}: "${shortText(itemText(shown.item.state))}" is ${late ? 'late' : `inside the ${RETURN_WINDOW_DAYS}-day window`}.`
		const why =
			days !== null
				? ` (Code counted ${days} days)`
				: chance !== null
					? ` (${Math.round(chance * PERCENT)}% likely inside)`
					: ''
		caption =
			letIn === null
				? `${head} ${name} gave no valid answer, so the return is stuck at the gate.`
				: `${head} ${name} ${letIn ? 'let it in' : 'turned it away'}${why}: ${shown.result.correct ? 'right' : 'wrong'}.`
	}

	return (
		<ArenaLane
			racer={racer}
			label="guards the warehouse"
			tally={`Late returns stopped ${tally.caught} of ${tally.bad}${tally.falseAlarms > 0 ? `, ${tally.falseAlarms} good ones refused` : ''}`}
			thinking={busy}
			caption={caption}
		>
			<Stage width={WIDTH} height={HEIGHT}>
				<rect width={WIDTH} height={HEIGHT} className="fill-surface-hover/60" />
				<rect x={0} y={ROAD.top} width={DOOR_X} height={ROAD.height} className="fill-border" />
				<line
					x1={0}
					x2={DOOR_X}
					y1={laneY}
					y2={laneY}
					strokeDasharray="8 8"
					strokeWidth={2}
					className="stroke-surface"
				/>
				<g>
					<path
						d={`M${DOOR_X} ${ROAD.top + ROAD.height} V${ROAD.top - 34} L${DOOR_X + 29} ${ROAD.top - 56} L${WIDTH - 2} ${ROAD.top - 34} V${ROAD.top + ROAD.height} Z`}
						strokeWidth={2}
						className="fill-surface stroke-border-strong"
					/>
					<text
						x={DOOR_X + 29}
						y={ROAD.top - 38}
						textAnchor="middle"
						fontSize={8}
						fontWeight={800}
						className="fill-text-muted"
					>
						WAREHOUSE
					</text>
				</g>
				<g>
					<rect
						x={TOWER_X - 10}
						y={24}
						width={20}
						height={ROAD.top - 24}
						rx={2}
						className="fill-border-strong"
					/>
					<rect
						x={TOWER_X - 15}
						y={14}
						width={30}
						height={14}
						rx={3}
						className={RACER_SVG[racer].fill}
					/>
				</g>
				<text
					x={TOWER_X + 40}
					y={PILE_Y + 16}
					fontSize={8}
					fontWeight={800}
					className="fill-text-muted"
				>
					TURNED AWAY
				</text>
				{list.map((play) => {
					if (play.index === shown?.index || yesOf(racer, play.result) === null) return null
					const spot = restingSpot(racer, list, play)
					return (
						<Parcel key={play.item.id} x={spot.x} y={spot.y} className={toneOf(play.result).fill} />
					)
				})}
				{shown && (
					<g key={playKey(shown, replay)}>
						{letIn === true && (
							<m.g
								initial={{ x: 0 }}
								animate={{ x: DOOR_X + 6 }}
								transition={{ duration: WALK_S, ease: 'easeInOut' }}
							>
								<Parcel x={0} y={laneY} className={tone?.fill ?? ''} />
							</m.g>
						)}
						{letIn === false && (
							<>
								<m.g
									initial={{ x: 0, y: 0 }}
									animate={{ x: [0, ZAP_X, ZAP_X], y: [0, 0, PILE_Y - laneY] }}
									transition={{ duration: WALK_S * 1.5, times: [0, 0.6, 1] }}
								>
									<Parcel x={0} y={laneY} className={tone?.fill ?? ''} />
								</m.g>
								<m.line
									x1={TOWER_X}
									y1={28}
									x2={ZAP_X}
									y2={laneY}
									strokeWidth={3}
									className={RACER_SVG[racer].stroke}
									initial={{ opacity: 0 }}
									animate={{ opacity: [0, 1, 0] }}
									transition={{ delay: WALK_S * 0.8, duration: WALK_S / 2 }}
								/>
							</>
						)}
						{letIn === null && (
							<>
								<Parcel x={PARCEL} y={laneY} className="fill-warning" />
								<text
									x={PARCEL}
									y={laneY - 14}
									textAnchor="middle"
									fontSize={14}
									fontWeight={800}
									className="fill-warning"
								>
									?
								</text>
							</>
						)}
						{days !== null && (
							<text
								x={ZAP_X}
								y={ROAD.top - 8}
								textAnchor="middle"
								fontSize={11}
								fontWeight={800}
								className="fill-text"
							>
								{`${days} days`}
							</text>
						)}
					</g>
				)}
			</Stage>
			<PlayMarks task={task} racer={racer} state={state} noun={NOUN} replay={replay} />
		</ArenaLane>
	)
}

/**
 * Date Defense: return requests walk to the warehouse, and each racer's tower turns away the ones
 * outside the return window. Jev + Code shows the day count its code worked out.
 */
export function TowersScene({
	game,
	task,
	perRacer
}: {
	game: Game
	task: Task
	perRacer: RaceState
}) {
	const replay = useReplay()
	const racers = LANE_RACERS.filter((racer) => perRacer[racer] !== undefined)
	return (
		<SceneFrame label={`${game.title} scene: ${game.blurb}`}>
			<ReplayBar noun={NOUN} replay={replay} />
			<ArenaLanes count={racers.length === 2 ? 2 : 3}>
				{racers.map((racer) => (
					<TowersLane
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
