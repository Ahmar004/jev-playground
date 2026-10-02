import { z } from 'zod'
import { LEVEL_COUNT, LEVEL_WIDGETS, PREDICTION_METRICS, RACERS, type Racer } from '@/lib/constants'

const MAX_LEARN_POINTS = 4
const MIN_COMPARED = 2
const MAX_COMPARED = 3
const MAX_REVEAL_PARAGRAPHS = 3
// A path on docs.typesafe.ai, with an optional #section (spec 2.4).
const DOCS_PATH = /^\/[a-z0-9/_.-]+(#[a-z0-9-]+)?$/

const text = z.string().min(1)
const slug = z.string().regex(/^[a-z0-9-]+$/)
const MIN_CHECK_OPTIONS = 2
const MAX_CHECK_OPTIONS = 4
const MAX_CHECK_QUESTIONS = 2

// A race prediction picks one of the two racers that face each other.
export const PREDICTABLE_RACERS = [RACERS.jev, RACERS.llm] as const
export type PredictedRacer = (typeof PREDICTABLE_RACERS)[number]

export const checkQuestionSchema = z
	.strictObject({
		id: slug,
		prompt: text,
		options: z
			.array(z.strictObject({ id: slug, text }))
			.min(MIN_CHECK_OPTIONS)
			.max(MAX_CHECK_OPTIONS)
			.refine(
				(options) => new Set(options.map((option) => option.id)).size === options.length,
				'Option ids are unique'
			),
		answerId: slug,
		explanation: text
	})
	.refine((question) => question.options.some((option) => option.id === question.answerId), {
		message: 'answerId must name an option'
	})
export type CheckQuestion = z.infer<typeof checkQuestionSchema>

// The tools a Router card can be sorted into (Jev, an LLM or plain code).
export const ROUTER_TOOLS = [
	RACERS.jev,
	RACERS.llm,
	RACERS.code
] as const satisfies readonly Racer[]
export type RouterTool = (typeof ROUTER_TOOLS)[number]

// Level 6: one card per task. `best` is the tool that suits the job and `why`
// says so in words; the recorded numbers back it up in Reveal.
export const routerCardSchema = z.strictObject({
	taskId: z.string().min(1),
	title: text,
	prompt: text,
	best: z.enum(ROUTER_TOOLS),
	why: text
})
export type RouterCard = z.infer<typeof routerCardSchema>

// content/levels/<levelId>.json (DESIGN 4.1).
export const levelSchema = z
	.strictObject({
		id: slug,
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
			// What is about to race, so each question has its context (Step-7 feedback).
			intro: text,
			questions: z
				.array(z.strictObject({ metric: z.enum(PREDICTION_METRICS), prompt: text }))
				.min(1)
				.refine(
					(questions) =>
						new Set(questions.map((question) => question.metric)).size === questions.length,
					'Each prediction is asked once'
				)
		}),
		// One race per task, in order. A judged task counts toward the prediction;
		// an unjudged one (level 3's "after the fix" races) is shown but not predicted.
		tasks: z
			.array(
				z.strictObject({ id: z.string().min(1), title: text, judged: z.boolean().default(true) })
			)
			.min(1)
			.refine((tasks) => tasks.some((task) => task.judged), 'A level judges at least one task'),
		widget: z.enum(LEVEL_WIDGETS).optional(),
		// Words only: Reveal's numbers come from the recordings at render time.
		reveal: z.strictObject({ why: z.array(text).min(1).max(MAX_REVEAL_PARAGRAPHS) }),
		docs: z.array(z.strictObject({ path: z.string().regex(DOCS_PATH), title: text })).min(1),
		// Level 6 only: the task cards to sort.
		router: z.array(routerCardSchema).min(2).optional(),
		check: z.strictObject({
			questions: z.array(checkQuestionSchema).min(1).max(MAX_CHECK_QUESTIONS)
		})
	})
	.refine((level) => (level.widget === LEVEL_WIDGETS.router) === (level.router !== undefined), {
		message: 'A router widget needs cards, and only it takes them',
		path: ['router']
	})
	.refine(
		(level) =>
			level.router?.every((card) => level.tasks.some((task) => task.id === card.taskId)) ?? true,
		{ message: 'Every router card names one of the level tasks', path: ['router'] }
	)
export type Level = z.infer<typeof levelSchema>
