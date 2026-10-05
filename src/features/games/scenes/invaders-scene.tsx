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
import { plays, type Play } from './play-data'
import { SceneFrame } from './scene-frame'
import { checkTally, itemText, noulOf, yesOf } from './scene-data'

const LANE_RACERS: readonly Racer[] = [RACERS.jev, RACERS.llm]
const NOUN = 'headline'
const PERCENT = 100

const WIDTH = 320
const HEIGHT = 220
const MARGIN_X = 18
const ROW_Y = [34, 62] as const
const SHIP_Y = 170
const PAGE_Y = 196
const PAGE_HEIGHT = 20
const FLY_S = 0.5
// A night sky in both themes, with light invaders and stars on it.
const SKY = 'fill-text dark:fill-bg'
const GLOW = 'fill-surface dark:fill-text'
// Stars stay in the same places on every render.
const STARS = [
	[22, 12],
	[70, 90],
	[118, 20],
	[160, 110],
	[205, 84],
	[250, 14],
	[296, 100],
	[40, 140],
	[140, 150],
	[228, 136],
	[300, 40],
	[92, 50]
] as const

// Headlines fill the rows in order, the second row shifted half a step, so every headline has
// its own column on the front page and the rows say nothing about the answers.
function slot(task: Task, index: number) {
	const columns = Math.max(1, Math.ceil(task.items.length / ROW_Y.length))
	const step = (WIDTH - 2 * MARGIN_X) / Math.max(1, columns - 0.5)
	const row = Math.floor(index / columns)
	return {
		x: MARGIN_X + (index % columns) * step + (row * step) / 2,
		y: ROW_Y[row] ?? ROW_Y[0]
	}
}

function Invader({ x, y, className }: { x: number; y: number; className: string }) {
	return (
		<g transform={`translate(${x} ${y})`}>
			<rect x={-8} y={-6} width={16} height={11} rx={3} className={className} />
			<rect x={-11} y={2} width={4} height={6} rx={1} className={className} />
			<rect x={7} y={2} width={4} height={6} rx={1} className={className} />
			<circle cx={-3.5} cy={-1} r={1.6} className={SKY} />
			<circle cx={3.5} cy={-1} r={1.6} className={SKY} />
		</g>
	)
}

function Burst({ x, y, className }: { x: number; y: number; className: string }) {
	return (
		<polygon
			transform={`translate(${x} ${y})`}
			points="0,-9 2.5,-3 9,-3 4,1 6,8 0,4 -6,8 -4,1 -9,-3 -2.5,-3"
			className={className}
		/>
	)
}

/** Where a decided headline rests: a burst where it was shot, a block on the front page where it landed, or a ? where it waits. */
function Resting({ task, racer, play }: { task: Task; racer: Racer; play: Play }) {
	const { x, y } = slot(task, play.index)
	const tone = toneOf(play.result)
	const shot = yesOf(racer, play.result)
	if (shot === null) {
		return (
			<text
				x={x}
				y={y + 4}
				textAnchor="middle"
				fontSize={14}
				fontWeight={800}
				className="fill-warning"
			>
				?
			</text>
		)
	}
	if (shot) return <Burst x={x} y={y} className={tone.fill} />
	return (
		<rect
			x={x - 6}
			y={PAGE_Y + 4}
			width={12}
			height={PAGE_HEIGHT - 8}
			rx={2}
			className={tone.fill}
		/>
	)
}

function InvadersLane({
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
	const tally = checkTally(task, state, racer, true)
	const shown = shownPlay(list, replay.picked)
	const busy = (state?.inFlight ?? 0) > 0 && replay.picked === null
	const decided = new Set(list.map((play) => play.index))
	const name = racerName(racer)

	const target = shown ? slot(task, shown.index) : null
	const shot = shown ? yesOf(racer, shown.result) : null
	const chance = shown ? noulOf(racer, shown.result) : null
	const tone = shown ? toneOf(shown.result) : null

	let caption: string | null = null
	if (shown) {
		const head = `Headline ${shown.index + 1}: "${shortText(itemText(shown.item.state))}" is ${shown.item.label === true ? 'clickbait' : 'honest'}.`
		const sure = chance === null ? '' : ` (${Math.round(chance * PERCENT)}% likely clickbait)`
		caption =
			shot === null
				? `${head} ${name} gave no valid answer, so it held its fire.`
				: `${head} ${name} ${shot ? 'shot it down' : 'let it land'}${sure}: ${shown.result.correct ? 'right' : 'wrong'}.`
	}

	return (
		<ArenaLane
			racer={racer}
			label="defends the front page"
			tally={`Clickbait shot ${tally.caught} of ${tally.bad}${tally.falseAlarms > 0 ? `, ${tally.falseAlarms} honest shot` : ''}`}
			thinking={busy}
			caption={caption}
		>
			<Stage width={WIDTH} height={HEIGHT}>
				<rect width={WIDTH} height={HEIGHT} className={SKY} />
				{STARS.map(([x, y]) => (
					<circle key={`${x}-${y}`} cx={x} cy={y} r={1} className={GLOW} opacity={0.7} />
				))}
				<rect x={0} y={PAGE_Y} width={WIDTH} height={PAGE_HEIGHT} className="fill-surface-hover" />
				<text x={6} y={PAGE_Y - 5} fontSize={9} fontWeight={800} className={GLOW}>
					FRONT PAGE
				</text>
				{task.items.map((item, index) =>
					decided.has(index) ? null : (
						<Invader key={item.id} {...slot(task, index)} className={GLOW} />
					)
				)}
				{list.map((play) =>
					play.index === shown?.index ? null : (
						<Resting key={play.item.id} task={task} racer={racer} play={play} />
					)
				)}
				{shown && target && (
					<g key={playKey(shown, replay)}>
						<m.g
							initial={{ x: WIDTH / 2 }}
							animate={{ x: target.x }}
							transition={{ duration: FLY_S / 2 }}
						>
							<polygon
								points={`0,${SHIP_Y - 12} 10,${SHIP_Y + 8} -10,${SHIP_Y + 8}`}
								className={RACER_SVG[racer].fill}
							/>
						</m.g>
						{shot === true && (
							<>
								<m.line
									x1={target.x}
									x2={target.x}
									y1={SHIP_Y - 12}
									y2={target.y}
									strokeWidth={3}
									className={RACER_SVG[racer].stroke}
									initial={{ opacity: 0 }}
									animate={{ opacity: [0, chance ?? 1, 0] }}
									transition={{ delay: FLY_S / 2, duration: FLY_S }}
								/>
								<m.g
									initial={{ opacity: 1 }}
									animate={{ opacity: 0 }}
									transition={{ delay: FLY_S, duration: FLY_S / 4 }}
								>
									<Invader x={target.x} y={target.y} className={GLOW} />
								</m.g>
								<m.g
									initial={{ scale: 0.4, opacity: 0 }}
									animate={{ scale: [0.4, 1.6, 1], opacity: 1 }}
									transition={{ delay: FLY_S, duration: FLY_S }}
									style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
								>
									<Burst x={target.x} y={target.y} className={tone?.fill ?? ''} />
								</m.g>
							</>
						)}
						{shot === false && (
							<m.g
								initial={{ y: 0 }}
								animate={{ y: PAGE_Y + PAGE_HEIGHT / 2 - target.y }}
								transition={{ delay: FLY_S / 2, duration: FLY_S, ease: 'easeIn' }}
							>
								<Invader x={target.x} y={target.y} className={tone?.fill ?? ''} />
							</m.g>
						)}
						{shot === null && (
							<>
								<Invader x={target.x} y={target.y} className={GLOW} />
								<text
									x={target.x}
									y={target.y - 12}
									textAnchor="middle"
									fontSize={14}
									fontWeight={800}
									className="fill-warning"
								>
									?
								</text>
							</>
						)}
					</g>
				)}
				{!shown && (
					<polygon
						points={`${WIDTH / 2},${SHIP_Y - 12} ${WIDTH / 2 + 10},${SHIP_Y + 8} ${WIDTH / 2 - 10},${SHIP_Y + 8}`}
						className={RACER_SVG[racer].fill}
					/>
				)}
			</Stage>
			<PlayMarks task={task} racer={racer} state={state} noun={NOUN} replay={replay} />
		</ArenaLane>
	)
}

/** Headline Invaders: each racer's ship shoots the headlines it calls clickbait and lets the rest land on the front page. */
export function InvadersScene({
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
					<InvadersLane
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
