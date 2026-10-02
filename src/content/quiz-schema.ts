import { z } from 'zod'
import { RACERS } from '@/lib/constants'

// The three tools a quiz question can name: Jev, an LLM or plain Code.
export const QUIZ_TOOLS = [RACERS.jev, RACERS.llm, RACERS.code] as const
export type QuizTool = (typeof QUIZ_TOOLS)[number]

const text = z.string().trim().min(1)

// `topic` is the id of the level the question belongs to.
export const quizQuestionSchema = z.strictObject({
	id: z.string().regex(/^[a-z0-9-]+$/),
	prompt: text,
	answer: z.enum(QUIZ_TOOLS),
	explanation: text,
	topic: z.string().min(1)
})
export type QuizQuestion = z.infer<typeof quizQuestionSchema>

// content/quizzes/<quizId>.json (DESIGN 4.1).
export const quizSchema = z
	.strictObject({
		id: z.string().min(1),
		title: text,
		intro: text,
		questions: z.array(quizQuestionSchema).min(1)
	})
	.refine(
		(quiz) => new Set(quiz.questions.map((question) => question.id)).size === quiz.questions.length,
		{
			message: 'Question ids are unique',
			path: ['questions']
		}
	)
export type Quiz = z.infer<typeof quizSchema>
