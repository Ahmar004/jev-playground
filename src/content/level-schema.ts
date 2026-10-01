import { z } from 'zod'
import { PREDICTION_METRICS, RACERS } from '@/lib/constants'

const LEVEL_COUNT = 8
const MAX_LEARN_POINTS = 4
const MIN_COMPARED = 2
const MAX_COMPARED = 3
const MAX_REVEAL_PARAGRAPHS = 3
// A path on docs.typesafe.ai, with an optional #section (spec 2.4).
const DOCS_PATH = /^\/[a-z0-9/_.-]+(#[a-z0-9-]+)?$/

const text = z.string().min(1)

// A race prediction picks one of the two racers that face each other.
export const PREDICTABLE_RACERS = [RACERS.jev, RACERS.llm] as const
export type PredictedRacer = (typeof PREDICTABLE_RACERS)[number]

// content/levels/<levelId>.json (DESIGN 4.1). Slice 5 adds check.
export const levelSchema = z.strictObject({
	id: z.string().regex(/^[a-z0-9-]+$/),
	order: z.number().int().min(1).max(LEVEL_COUNT),
	title: text,
	learn: z.strictObject({
		intro: text,
		compare: z
			.array(
				z.strictObject({
					racer: z.enum([RACERS.jev, RACERS.llm, RACERS.code]),
					title: text,
					points: z.array(text).min(1).max(MAX_LEARN_POINTS)
				})
			)
			.min(MIN_COMPARED)
			.max(MAX_COMPARED)
	}),
	predict: z.strictObject({
		questions: z
			.array(z.strictObject({ metric: z.enum(PREDICTION_METRICS), prompt: text }))
			.min(1)
			.refine(
				(questions) =>
					new Set(questions.map((question) => question.metric)).size === questions.length,
				'Each prediction is asked once'
			)
	}),
	taskIds: z.array(z.string().min(1)).min(1),
	// Words only: Reveal's numbers come from the recordings at render time.
	reveal: z.strictObject({ why: z.array(text).min(1).max(MAX_REVEAL_PARAGRAPHS) }),
	docs: z.array(z.strictObject({ path: z.string().regex(DOCS_PATH), title: text })).min(1)
})
export type Level = z.infer<typeof levelSchema>
