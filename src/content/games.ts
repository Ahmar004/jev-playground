import citationCop from '../../content/games/citation-cop.json'
import confidenceCatch from '../../content/games/confidence-catch.json'
import guardrailGauntlet from '../../content/games/guardrail-gauntlet.json'
import needleHunt from '../../content/games/needle-hunt.json'
import numberCrunch from '../../content/games/number-crunch.json'
import reviewTugOfWar from '../../content/games/review-tug-of-war.json'
import smartHomeDash from '../../content/games/smart-home-dash.json'
import twinFinder from '../../content/games/twin-finder.json'
import { gameSchema, type Game } from './game-schema'
import { TASKS } from './tasks'

// Every file in content/games/ is imported here, so content renders at build
// time (DESIGN 4.1). registry.test.ts fails when a file is missing.
const RAW_GAMES: unknown[] = [
	guardrailGauntlet,
	needleHunt,
	numberCrunch,
	reviewTugOfWar,
	smartHomeDash,
	twinFinder,
	confidenceCatch,
	citationCop
]

/** Parses games and checks ids and task ids, keyed by id in listed order. */
export function buildGameMap(
	raw: unknown[],
	taskIds: ReadonlySet<string>
): ReadonlyMap<string, Game> {
	const map = new Map<string, Game>()
	for (const entry of raw) {
		const game = gameSchema.parse(entry)
		if (map.has(game.id)) throw new Error(`Duplicate game id: ${game.id}`)
		if (!taskIds.has(game.taskId))
			throw new Error(`Game ${game.id} uses unknown task ${game.taskId}`)
		map.set(game.id, game)
	}
	return map
}

export const GAMES = buildGameMap(RAW_GAMES, new Set(TASKS.keys()))

export function getGame(gameId: string): Game | undefined {
	return GAMES.get(gameId)
}
