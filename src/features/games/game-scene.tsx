'use client'

import type { Game } from '@/content/game-schema'
import type { Task } from '@/content/task-schema'
import type { RaceState } from '@/features/race/race-state'
import { DEFAULT_CONFIDENCE_THRESHOLD, GAME_ANIMATIONS } from '@/lib/constants'
import { BeltsScene } from './scenes/belts-scene'
import { CheckpointScene } from './scenes/checkpoint-scene'
import { DuelScene } from './scenes/duel-scene'
import { FallScene } from './scenes/fall-scene'
import { GateScene } from './scenes/gate-scene'
import { LinesScene } from './scenes/lines-scene'
import { RopeScene } from './scenes/rope-scene'
import { RunnersScene } from './scenes/runners-scene'

/**
 * A game's scene, drawn only from the race's state, one step per finished call. Each game has its
 * own metaphor (DESIGN 8); Confidence Catch also takes the threshold the player is dragging.
 */
export function GameScene({
	game,
	task,
	perRacer,
	threshold = DEFAULT_CONFIDENCE_THRESHOLD
}: {
	game: Game
	task: Task
	perRacer: RaceState
	threshold?: number
}) {
	switch (game.animation) {
		case GAME_ANIMATIONS.gate:
			return <GateScene game={game} task={task} perRacer={perRacer} />
		case GAME_ANIMATIONS.lines:
			return <LinesScene game={game} task={task} perRacer={perRacer} />
		case GAME_ANIMATIONS.duel:
			return <DuelScene game={game} task={task} perRacer={perRacer} />
		case GAME_ANIMATIONS.rope:
			return <RopeScene game={game} task={task} perRacer={perRacer} />
		case GAME_ANIMATIONS.runners:
			return <RunnersScene game={game} task={task} perRacer={perRacer} />
		case GAME_ANIMATIONS.belts:
			return <BeltsScene game={game} task={task} perRacer={perRacer} />
		case GAME_ANIMATIONS.fall:
			return <FallScene game={game} task={task} perRacer={perRacer} threshold={threshold} />
		case GAME_ANIMATIONS.checkpoint:
			return <CheckpointScene game={game} task={task} perRacer={perRacer} />
	}
}
