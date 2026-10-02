import { z } from 'zod'
import { GAME_ANIMATIONS } from '@/lib/constants'

const text = z.string().min(1)
// A path on docs.typesafe.ai, with an optional #section (spec 2.4).
const DOCS_PATH = /^\/[a-z0-9/_.-]+(#[a-z0-9-]+)?$/
const MAX_WHY_PARAGRAPHS = 3

// content/games/<gameId>.json (DESIGN 8). Words only: the numbers come from
// the Recordings at render time, so content never states a result.
export const gameSchema = z.strictObject({
	id: z.string().regex(/^[a-z0-9-]+$/),
	title: text,
	priority: z.enum(['p0', 'p1']),
	taskId: z.string().min(1),
	blurb: text,
	animation: z.enum(GAME_ANIMATIONS),
	// The lesson in one sentence, shown before the run and in the summary.
	lesson: text,
	why: z.array(text).min(1).max(MAX_WHY_PARAGRAPHS),
	docs: z.strictObject({ path: z.string().regex(DOCS_PATH), title: text })
})
export type Game = z.infer<typeof gameSchema>
