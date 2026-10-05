import { z } from 'zod'
import { GAME_ANIMATIONS } from '@/lib/constants'

const text = z.string().min(1)
// A path on docs.typesafe.ai, with an optional #section (spec 2.4).
const DOCS_PATH = /^\/[a-z0-9/_.-]+(#[a-z0-9-]+)?$/
const MAX_WHY_PARAGRAPHS = 3

// What a task's items are called on the page ("messages"), and for a yes or no task the words
// for each answer ("Supported"), so item lists and answers read in the page's own terms.
export const itemWordsSchema = z.strictObject({
	plural: text,
	yes: text.optional(),
	no: text.optional()
})
export type ItemWords = z.infer<typeof itemWordsSchema>

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
	items: itemWordsSchema,
	docs: z.strictObject({ path: z.string().regex(DOCS_PATH), title: text })
})
export type Game = z.infer<typeof gameSchema>
