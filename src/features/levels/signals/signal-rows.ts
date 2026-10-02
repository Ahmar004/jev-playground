import { z } from 'zod'
import type { Recording } from '@/content/recording-schema'
import type { Task } from '@/content/task-schema'
import { NOUL_THRESHOLD, QUESTION_KINDS } from '@/lib/constants'
import { jevAnswerSchema } from '@/runner/parse'

const jevAnswersSchema = z.record(z.string(), jevAnswerSchema)
const llmAnswersSchema = z.record(z.string(), z.boolean())
const truthSchema = z.record(z.string(), z.boolean())

export type SignalRow = {
	key: string
	// What the sign means, in the words Jev is asked.
	text: string
	// Jev's probability for the sign; null when its answer did not parse.
	probability: number | null
	// Whether the sign lights up: probability at or above the Noul threshold.
	lit: boolean | null
	truth: boolean | null
	llmYes: boolean | null
}

/** One email's signs: Jev's probability, the true answer and the LLM's yes or no for each (level 7). */
export function signalRows(
	task: Task,
	itemId: string,
	jev: Recording,
	opponent: Recording | undefined
): SignalRow[] {
	if (!('questions' in task.jev)) return []
	const item = task.items.find((candidate) => candidate.id === itemId)
	const truth = truthSchema.safeParse(item?.label)
	const jevAnswers = jevAnswersSchema.safeParse(
		jev.events.find((event) => event.itemId === itemId)?.parsed
	)
	const llmAnswers = llmAnswersSchema.safeParse(
		opponent?.events.find((event) => event.itemId === itemId)?.parsed
	)
	return Object.entries(task.jev.questions).map(([key, question]) => {
		const answer = jevAnswers.success ? jevAnswers.data[key] : undefined
		const probability = answer?.type === QUESTION_KINDS.noul ? answer.noul : null
		return {
			key,
			text: typeof question.instructions === 'string' ? question.instructions : key,
			probability,
			lit: probability === null ? null : probability >= NOUL_THRESHOLD,
			truth: truth.success ? (truth.data[key] ?? null) : null,
			llmYes: llmAnswers.success ? (llmAnswers.data[key] ?? null) : null
		}
	})
}
