'use client'

import dynamic from 'next/dynamic'
import type { Game } from '@/content/game-schema'
import type { Task } from '@/content/task-schema'
import type { RaceState } from '@/features/race/race-state'
import { DEFAULT_CONFIDENCE_THRESHOLD, GAME_ANIMATIONS } from '@/lib/constants'

/** Shown while a scene's code loads: the same card, so the page doesn't jump. */
function SceneLoading() {
	return (
		<div
			role="status"
			className="bg-surface border-border shadow-card text-text-muted flex min-h-48 items-center justify-center rounded-lg border p-4 text-sm"
		>
			<span className="animate-pulse motion-reduce:animate-none">Loading the scene...</span>
		</div>
	)
}

// Each scene is its own chunk, so a game page downloads only the scene it draws (R79).
const GateScene = dynamic(() => import('./scenes/gate-scene').then((mod) => mod.GateScene), {
	loading: SceneLoading
})
const LinesScene = dynamic(() => import('./scenes/lines-scene').then((mod) => mod.LinesScene), {
	loading: SceneLoading
})
const DuelScene = dynamic(() => import('./scenes/duel-scene').then((mod) => mod.DuelScene), {
	loading: SceneLoading
})
const RopeScene = dynamic(() => import('./scenes/rope-scene').then((mod) => mod.RopeScene), {
	loading: SceneLoading
})
const RunnersScene = dynamic(
	() => import('./scenes/runners-scene').then((mod) => mod.RunnersScene),
	{ loading: SceneLoading }
)
const BeltsScene = dynamic(() => import('./scenes/belts-scene').then((mod) => mod.BeltsScene), {
	loading: SceneLoading
})
const FallScene = dynamic(() => import('./scenes/fall-scene').then((mod) => mod.FallScene), {
	loading: SceneLoading
})
const CheckpointScene = dynamic(
	() => import('./scenes/checkpoint-scene').then((mod) => mod.CheckpointScene),
	{ loading: SceneLoading }
)
const PenaltyScene = dynamic(
	() => import('./scenes/penalty-scene').then((mod) => mod.PenaltyScene),
	{ loading: SceneLoading }
)
const InvadersScene = dynamic(
	() => import('./scenes/invaders-scene').then((mod) => mod.InvadersScene),
	{ loading: SceneLoading }
)
const ArcheryScene = dynamic(
	() => import('./scenes/archery-scene').then((mod) => mod.ArcheryScene),
	{ loading: SceneLoading }
)
const MazeScene = dynamic(() => import('./scenes/maze-scene').then((mod) => mod.MazeScene), {
	loading: SceneLoading
})
const HoopsScene = dynamic(() => import('./scenes/hoops-scene').then((mod) => mod.HoopsScene), {
	loading: SceneLoading
})
const TowersScene = dynamic(() => import('./scenes/towers-scene').then((mod) => mod.TowersScene), {
	loading: SceneLoading
})

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
	const props = { game, task, perRacer }
	switch (game.animation) {
		case GAME_ANIMATIONS.gate:
			return <GateScene {...props} />
		case GAME_ANIMATIONS.lines:
			return <LinesScene {...props} />
		case GAME_ANIMATIONS.duel:
			return <DuelScene {...props} />
		case GAME_ANIMATIONS.rope:
			return <RopeScene {...props} />
		case GAME_ANIMATIONS.runners:
			return <RunnersScene {...props} />
		case GAME_ANIMATIONS.belts:
			return <BeltsScene {...props} />
		case GAME_ANIMATIONS.fall:
			return <FallScene {...props} threshold={threshold} />
		case GAME_ANIMATIONS.checkpoint:
			return <CheckpointScene {...props} />
		case GAME_ANIMATIONS.penalty:
			return <PenaltyScene {...props} />
		case GAME_ANIMATIONS.invaders:
			return <InvadersScene {...props} />
		case GAME_ANIMATIONS.archery:
			return <ArcheryScene {...props} />
		case GAME_ANIMATIONS.maze:
			return <MazeScene {...props} />
		case GAME_ANIMATIONS.hoops:
			return <HoopsScene {...props} />
		case GAME_ANIMATIONS.towers:
			return <TowersScene {...props} />
	}
}
