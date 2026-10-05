import { z } from 'zod'
import type { Task } from '@/content/task-schema'
import { NOUL_THRESHOLD, QUESTION_KINDS, RACERS, TASK_KINDS, type Racer } from '@/lib/constants'
import { jevAnswerSchema } from '@/runner/parse'
import type { ItemResult } from '@/runner/types'
import { stateText } from './snapshot'

// A fan_out preset asks many yes or no questions about one item (Phishing signals). These read
// each question's answer out of the stored results, so the Arena can show them one by one.
// Nothing here scores (R92): yes is the same bar the scorer and the game scenes use.

const jevAnswersSchema = z.record(z.string(), jevAnswerSchema)
const flagsSchema = z.record(z.string(), z.boolean())

export type FanOutQuestion = { name: string; text: string }
export type FanOutAnswer = { yes: boolean; probability: number | null }

/** A fan_out task's questions in order, each with its wording; null for any other task. */
export function fanOutQuestions(task: Task): FanOutQuestion[] | null {
	if (task.kind !== TASK_KINDS.fanOut) return null
	const questions =
		task.items[0]?.questions ?? ('questions' in task.jev ? task.jev.questions : null)
	if (!questions) return null
	return Object.entries(questions).map(([name, question]) => ({
		name,
		text: stateText(question.instructions)
	}))
}

/** One question's answer: Jev's probability against the yes bar, or the LLM's boolean; null when unparsed or missing (R44). */
export function fanOutAnswer(racer: Racer, result: ItemResult, name: string): FanOutAnswer | null {
	if (!result.ok) return null
	if (racer === RACERS.jev) {
		const answers = jevAnswersSchema.safeParse(result.parsed)
		const answer = answers.success ? answers.data[name] : undefined
		if (answer?.type !== QUESTION_KINDS.noul) return null
		return { yes: answer.noul >= NOUL_THRESHOLD, probability: answer.noul }
	}
	const flags = flagsSchema.safeParse(result.parsed)
	const flag = flags.success ? flags.data[name] : undefined
	return flag === undefined ? null : { yes: flag, probability: null }
}
