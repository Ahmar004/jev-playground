'use client'

import { m } from 'motion/react'
import type { Game } from '@/content/game-schema'
import type { Task } from '@/content/task-schema'
import type { RaceState, RacerState } from '@/features/race/race-state'
import { racerName } from '@/features/race/racer-names'
import { RACERS, type Racer } from '@/lib/constants'
import { SCORE_TOLERANCE } from '@/runner/score'
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
import { plays, scoreOffset, type Play } from './play-data'
import { SceneFrame } from './scene-frame'
import { itemText, scoreLevelNames, scoreOf } from './scene-data'

const LANE_RACERS: readonly Racer[] = [RACERS.jev, RACERS.llm]
const NOUN = 'bug'

const WIDTH = 320
const HEIGHT = 210
const CENTER = { x: 160, y: 96 }
const RADIUS = 84
// The bullseye covers the scorer's tolerance; every ring after it is one more level off.
const RING_COUNT = 4
const RING_WIDTH = RADIUS / (RING_COUNT + SCORE_TOLERANCE * 2)
const GROUND_Y = 196
const SPREAD_DEGREES = 70
const NEAR_ZERO = 0.05
const ARROW_S = 0.45
const FROM_BELOW = 120
const DECIMALS = 10
// Exact hits circle the centre, inside the bullseye, so they don't stack on one point.
const BULLSEYE_SPREAD = 0.6
const BULLSEYE_TURNS = 4
// Unparsed arrows lie on the ground in a row from the left.
const GROUND_START_X = 24
const GROUND_STEP_X = 18

// Where an arrow lands: its distance from the centre is how many levels off the rating was,
// left of centre when under-rated and right when over-rated. Items fan out by number so
// arrows on the same ring don't hide each other.
function landing(task: Task, play: Play, offset: number) {
	const spread = task.items.length <= 1 ? 0 : play.index / (task.items.length - 1) - 0.5
	const angle = (spread * SPREAD_DEGREES * Math.PI) / 180
	const distance = Math.abs(offset)
	if (distance < NEAR_ZERO) {
		const nudge = RING_WIDTH * SCORE_TOLERANCE * BULLSEYE_SPREAD
		return {
			x: CENTER.x + Math.cos(angle * BULLSEYE_TURNS) * nudge,
			y: CENTER.y + Math.sin(angle * BULLSEYE_TURNS) * nudge
		}
	}
	const r = distance * RING_WIDTH
	const side = offset < 0 ? -1 : 1
	return { x: CENTER.x + side * r * Math.cos(angle), y: CENTER.y + r * Math.sin(angle) }
}

function Target() {
	const rings = Array.from({ length: RING_COUNT + 1 }, (_, ring) => RING_COUNT - ring)
	return (
		<g>
			{rings.map((ring) => (
				<circle
					key={ring}
					cx={CENTER.x}
					cy={CENTER.y}
					r={(ring + SCORE_TOLERANCE) * RING_WIDTH}
					strokeWidth={1.5}
					className={
						ring === 0
							? 'fill-success/30 stroke-border-strong'
							: ring % 2
								? 'fill-surface-hover stroke-border-strong'
								: 'fill-surface stroke-border-strong'
					}
				/>
			))}
			<line
				x1={CENTER.x}
				x2={CENTER.x}
				y1={CENTER.y - RADIUS}
				y2={CENTER.y + RADIUS}
				strokeDasharray="3 4"
				className="stroke-border"
			/>
			<text x={8} y={18} fontSize={10} fontWeight={800} className="fill-text-muted">
				UNDER-RATED
			</text>
			<text
				x={WIDTH - 8}
				y={18}
				textAnchor="end"
				fontSize={10}
				fontWeight={800}
				className="fill-text-muted"
			>
				OVER-RATED
			</text>
			<line x1={0} x2={WIDTH} y1={GROUND_Y} y2={GROUND_Y} className="stroke-border-strong" />
		</g>
	)
}

function Arrow({ x, y, racer }: { x: number; y: number; racer: Racer }) {
	return (
		<g transform={`translate(${x} ${y})`}>
			<line
				x1={0}
				y1={0}
				x2={9}
				y2={9}
				strokeWidth={2.5}
				strokeLinecap="round"
				className={RACER_SVG[racer].stroke}
			/>
			<circle r={3.2} className={`${RACER_SVG[racer].fill} stroke-surface`} strokeWidth={1} />
		</g>
	)
}

function levelText(names: readonly string[], level: number): string {
	return names[Math.round(level)] ?? String(level)
}

function ArcheryLane({
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
	const names = scoreLevelNames(task)
	const list = plays(task, state)
	const bullseyes = list.filter((play) => play.result.correct === true).length
	const shown = shownPlay(list, replay.picked)
	const busy = (state?.inFlight ?? 0) > 0 && replay.picked === null
	const name = racerName(racer)

	const landed = list.flatMap((play) => {
		const offset = scoreOffset(racer, play.result, play.item.label)
		return offset === null ? [] : [{ play, ...landing(task, play, offset) }]
	})
	const dropped = list.filter((play) => scoreOffset(racer, play.result, play.item.label) === null)
	const shownOffset = shown ? scoreOffset(racer, shown.result, shown.item.label) : null
	const shownAt = shown && shownOffset !== null ? landing(task, shown, shownOffset) : null

	let caption: string | null = null
	if (shown) {
		const right =
			typeof shown.item.label === 'number' ? levelText(names, shown.item.label) : 'unlabelled'
		const head = `Bug ${shown.index + 1}: "${shortText(itemText(shown.item.state))}" is ${right}.`
		const score = scoreOf(racer, shown.result)
		if (score === null || shownOffset === null) {
			caption = `${head} ${name} gave no valid answer, so its arrow fell short.`
		} else {
			const said =
				racer === RACERS.jev
					? `${levelText(names, score)} (${Math.round(score * DECIMALS) / DECIMALS})`
					: levelText(names, score)
			const off = Math.round(Math.abs(shownOffset))
			const where =
				shown.result.correct === true
					? 'bullseye'
					: `${off} ring${off === 1 ? '' : 's'} out, ${shownOffset < 0 ? 'under-rated' : 'over-rated'}`
			caption = `${head} ${name} said ${said}: ${where}.`
		}
	}

	return (
		<ArenaLane
			racer={racer}
			label="at the target"
			tally={`Bullseyes ${bullseyes} of ${task.items.length}`}
			thinking={busy}
			caption={caption}
		>
			<Stage width={WIDTH} height={HEIGHT}>
				<Target />
				{landed.map(({ play, x, y }) =>
					play.index === shown?.index ? null : (
						<Arrow key={play.item.id} x={x} y={y} racer={racer} />
					)
				)}
				{dropped.map((play, n) =>
					play.index === shown?.index ? null : (
						<g
							key={play.item.id}
							transform={`translate(${GROUND_START_X + n * GROUND_STEP_X} ${GROUND_Y - 4})`}
						>
							<line x1={-7} x2={7} y1={0} y2={0} strokeWidth={2.5} className="stroke-warning" />
						</g>
					)
				)}
				{shown && (
					<g key={playKey(shown, replay)}>
						{shownAt ? (
							<m.g
								initial={{ y: FROM_BELOW, opacity: 0, scale: 2 }}
								animate={{ y: 0, opacity: 1, scale: 1 }}
								transition={{ duration: ARROW_S, ease: 'easeOut' }}
								style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
							>
								<circle
									cx={shownAt.x}
									cy={shownAt.y}
									r={9}
									fill="none"
									strokeWidth={2}
									className="stroke-text"
								/>
								<Arrow x={shownAt.x} y={shownAt.y} racer={racer} />
							</m.g>
						) : (
							<m.g
								initial={{ y: -40, opacity: 0 }}
								animate={{ y: 0, opacity: 1 }}
								transition={{ duration: ARROW_S }}
							>
								<line
									x1={CENTER.x - 10}
									x2={CENTER.x + 10}
									y1={GROUND_Y - 4}
									y2={GROUND_Y - 4}
									strokeWidth={3}
									className="stroke-warning"
								/>
								<text
									x={CENTER.x}
									y={GROUND_Y - 12}
									textAnchor="middle"
									fontSize={14}
									fontWeight={800}
									className="fill-warning"
								>
									?
								</text>
							</m.g>
						)}
					</g>
				)}
			</Stage>
			<PlayMarks task={task} racer={racer} state={state} noun={NOUN} replay={replay} />
		</ArenaLane>
	)
}

/** Severity Archery: the bullseye is each bug's right severity, and every ring out is one level off. */
export function ArcheryScene({
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
					<ArcheryLane
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
