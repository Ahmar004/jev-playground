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
	type Replay,
	useReplay
} from './arena-kit'
import { answeredPrefix, mazePath, playFor, plays, type Cell } from './play-data'
import { SceneFrame } from './scene-frame'
import { decisionOf, itemText } from './scene-data'

const LANE_RACERS: readonly Racer[] = [RACERS.jev, RACERS.llm]
const NOUN = 'junction'

const CELL = 34
const PAD = 26
const CORRIDOR = 16
const WALL = 22
// A wrong turn runs this far into its dead end before the wall stops it.
const STUB = 0.45
const STEP_S = 0.7

function turnWord(direction: string): string {
	return direction === 'straight' ? 'straight on' : direction
}

function MazeLane({
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
	const directions = task.items.map((item) => (typeof item.label === 'string' ? item.label : ''))
	const { cells, junctions } = mazePath(directions)
	const stubs = junctions.flatMap((junction, index) =>
		Object.entries(junction.exits)
			.filter(([direction]) => direction !== directions[index])
			.map(([direction, heading]) => ({ index, direction, at: junction.at, heading }))
	)
	const xs = [
		...cells,
		...stubs.map((stub) => ({ x: stub.at.x + stub.heading.x, y: stub.at.y + stub.heading.y }))
	]
	const minX = Math.min(...xs.map((cell) => cell.x))
	const minY = Math.min(...xs.map((cell) => cell.y))
	const width = (Math.max(...xs.map((cell) => cell.x)) - minX) * CELL + PAD * 2
	const height = (Math.max(...xs.map((cell) => cell.y)) - minY) * CELL + PAD * 2
	const point = (cell: Cell, toward?: Cell, share = 0) => ({
		x: PAD + (cell.x - minX + (toward?.x ?? 0) * share) * CELL,
		y: PAD + (cell.y - minY + (toward?.y ?? 0) * share) * CELL
	})
	const route = cells.map((cell) => point(cell))
	const routePath = route.map((p, n) => `${n === 0 ? 'M' : 'L'}${p.x} ${p.y}`).join(' ')

	const list = plays(task, state)
	const passed = list.filter((play) => play.result.correct === true).length
	const bumps = list.filter((play) => play.result.ok && play.result.correct === false).length
	// Live, the robot stands at the furthest junction answered without a gap, so it only walks forward.
	const reached = answeredPrefix(task, state)
	const shownIndex = replay.picked ?? (reached > 0 ? reached - 1 : null)
	const shown = shownIndex === null ? undefined : playFor(list, shownIndex)
	const busy = (state?.inFlight ?? 0) > 0 && replay.picked === null
	const name = racerName(racer)

	const went = shown ? decisionOf(racer, shown.result) : null
	const junction = shown ? junctions[shown.index] : undefined
	const from = junction ? point(junction.at) : route[0]
	const to = shown ? route[shown.index + 1] : undefined
	const wrongHeading =
		junction && went && went !== directions[shown?.index ?? -1] ? junction.exits[went] : undefined
	const bump = junction && wrongHeading ? point(junction.at, wrongHeading, STUB) : undefined
	const path =
		!from || !to ? [] : went === null ? [from, from] : bump ? [from, bump, from, to] : [from, to]

	let caption: string | null = null
	if (shown) {
		const right = directions[shown.index] ?? ''
		const head = `Junction ${shown.index + 1}: "${shortText(itemText(shown.item.state))}" means ${turnWord(right)}.`
		caption =
			went === null
				? `${head} ${name} gave no valid answer, so its robot stood still.`
				: bump
					? `${head} ${name} went ${turnWord(went)}, hit the wall of a dead end and was put back on the path.`
					: `${head} ${name} went ${turnWord(went)}: right.`
	}

	return (
		<ArenaLane
			racer={racer}
			label="steers the robot"
			tally={`Junctions passed ${passed} of ${task.items.length}${bumps > 0 ? `, ${bumps} into a wall` : ''}`}
			thinking={busy}
			caption={caption}
		>
			<Stage width={width} height={height}>
				<rect width={width} height={height} className="fill-surface-hover/60" />
				{stubs.map((stub) => {
					const start = point(stub.at)
					const end = point(stub.at, stub.heading, STUB + 0.1)
					const hit = list.some(
						(play) => play.index === stub.index && decisionOf(racer, play.result) === stub.direction
					)
					return (
						<g key={`${stub.index}-${stub.direction}`}>
							<line
								x1={start.x}
								y1={start.y}
								x2={end.x}
								y2={end.y}
								strokeWidth={CORRIDOR}
								strokeLinecap="butt"
								className="stroke-border"
							/>
							<line
								x1={end.x - (stub.heading.y * WALL) / 2}
								y1={end.y - (stub.heading.x * WALL) / 2}
								x2={end.x + (stub.heading.y * WALL) / 2}
								y2={end.y + (stub.heading.x * WALL) / 2}
								strokeWidth={4}
								strokeLinecap="round"
								className={hit ? 'stroke-danger' : 'stroke-border-strong'}
							/>
						</g>
					)
				})}
				<path
					d={routePath}
					fill="none"
					strokeWidth={CORRIDOR}
					strokeLinecap="round"
					strokeLinejoin="round"
					className="stroke-border-strong"
				/>
				<path
					d={routePath}
					fill="none"
					strokeWidth={CORRIDOR - 6}
					strokeLinecap="round"
					strokeLinejoin="round"
					className="stroke-surface"
				/>
				{junctions.map((junctionAt, index) => {
					const p = point(junctionAt.at)
					const play = playFor(list, index)
					const tone = !play
						? 'fill-border-strong'
						: play.result.correct === true
							? 'fill-success'
							: play.result.ok
								? 'fill-danger'
								: 'fill-warning'
					return <circle key={index} cx={p.x} cy={p.y} r={3.5} className={tone} />
				})}
				{route.at(-1) && (
					<g transform={`translate(${route.at(-1)?.x} ${route.at(-1)?.y})`}>
						<line x1={0} y1={0} x2={0} y2={-18} strokeWidth={2} className="stroke-text" />
						<path d="M0 -18 L12 -14 L0 -10 Z" className="fill-success" />
					</g>
				)}
				{route[0] && (
					<text
						x={route[0].x}
						y={route[0].y + 18}
						textAnchor="middle"
						fontSize={9}
						fontWeight={800}
						className="fill-text-muted"
					>
						START
					</text>
				)}
				{shown && path.length > 0 ? (
					<m.g
						key={playKey(shown, replay)}
						initial={{ x: path[0]?.x, y: path[0]?.y }}
						animate={{ x: path.map((p) => p.x), y: path.map((p) => p.y) }}
						transition={{ duration: STEP_S * (path.length - 1 || 1), ease: 'easeInOut' }}
					>
						<Robot racer={racer} />
						{went === null && (
							<text
								y={-14}
								textAnchor="middle"
								fontSize={14}
								fontWeight={800}
								className="fill-warning"
							>
								?
							</text>
						)}
					</m.g>
				) : (
					route[0] && (
						<g transform={`translate(${route[0].x} ${route[0].y})`}>
							<Robot racer={racer} />
						</g>
					)
				)}
			</Stage>
			<PlayMarks task={task} racer={racer} state={state} noun={NOUN} replay={replay} />
		</ArenaLane>
	)
}

function Robot({ racer }: { racer: Racer }) {
	return (
		<g>
			<rect x={-8} y={-8} width={16} height={16} rx={4} className={RACER_SVG[racer].fill} />
			<circle cx={-3} cy={-2} r={2} className="fill-surface" />
			<circle cx={3} cy={-2} r={2} className="fill-surface" />
			<line x1={0} y1={-8} x2={0} y2={-12} strokeWidth={2} className={RACER_SVG[racer].stroke} />
		</g>
	)
}

/** Double-Negative Maze: every instruction is a junction; a robot turns the way its racer read it, and a wrong turn hits a wall. */
export function MazeScene({
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
					<MazeLane key={racer} racer={racer} task={task} state={perRacer[racer]} replay={replay} />
				))}
			</ArenaLanes>
		</SceneFrame>
	)
}
