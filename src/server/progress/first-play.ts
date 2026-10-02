import { z } from 'zod'
import { ROUTER_TOOLS, type Level } from '@/content/level-schema'
import type { Recording } from '@/content/recording-schema'
import type { Task } from '@/content/task-schema'
import { trickPairs } from '@/features/levels/tricks/pairs'
import { BADGES, LEVEL_WIDGETS, type BadgeId } from '@/lib/constants'

const MAX_ENTRIES = 50

/** The user's first try at a level's own game, sent before the first Reveal. */
export const firstPlaySchema = z.discriminatedUnion('kind', [
	z.strictObject({
		kind: z.literal(LEVEL_WIDGETS.router),
		assignments: z
			.record(z.string().max(80), z.enum(ROUTER_TOOLS))
			.refine((value) => Object.keys(value).length <= MAX_ENTRIES)
	}),
	z.strictObject({
		kind: z.literal(LEVEL_WIDGETS.tricks),
		guesses: z
			.record(z.string().max(80), z.boolean())
			.refine((value) => Object.keys(value).length <= MAX_ENTRIES)
	})
])
export type FirstPlay = z.infer<typeof firstPlaySchema>

export type FirstPlayContext = { level: Level; task: Task | undefined; jev: Recording | undefined }

function sameKeys(given: Record<string, unknown>, expected: string[]): boolean {
	const keys = Object.keys(given)
	return keys.length === expected.length && expected.every((key) => key in given)
}

/**
 * Checks a first try against the level content and Jev's recording.
 * Returns the badge it earns, null when it earns none, or 'invalid' when the
 * play does not fit the level (wrong game, or a card or pair left out).
 */
export function firstPlayBadge(
	play: FirstPlay,
	{ level, task, jev }: FirstPlayContext
): BadgeId | null | 'invalid' {
	if (play.kind !== level.widget) return 'invalid'
	if (play.kind === LEVEL_WIDGETS.router) {
		const cards = level.router ?? []
		const cardIds = cards.map((card) => card.taskId)
		if (!sameKeys(play.assignments, cardIds)) return 'invalid'
		// right_tool: every card sorted to the tool that suits it best (DESIGN 10).
		return cards.every((card) => play.assignments[card.taskId] === card.best)
			? BADGES.rightTool
			: null
	}
	if (!task || !jev) return 'invalid'
	const pairs = trickPairs(task, jev, undefined)
	const pairIds = pairs.map((pair) => pair.id)
	if (!sameKeys(play.guesses, pairIds)) return 'invalid'
	// trickster: every guess matches what Jev did in the recording (user decision, Step-7).
	// A pair whose answer did not parse has no right guess, so it never blocks the badge.
	return pairs.every((pair) => pair.fooled === null || play.guesses[pair.id] === pair.fooled)
		? BADGES.trickster
		: null
}
