import { z } from 'zod'
import type { Recording } from '@/content/recording-schema'
import type { Task } from '@/content/task-schema'
import { combineResult } from '@/runner/combine'
import { DEFAULT_WEIGHT, type CombineArgs } from '@/runner/code/combine-fns'

export const MIN_WEIGHT = 0
export const MAX_WEIGHT = 5

export type Weights = Record<string, number>

export type CompositeRow = {
	itemId: string
	// 0 to 1, the weighted share of small questions answered yes; null when it could not be built.
	composite: number | null
	// The combined verdict, and whether it matches the label.
	verdict: boolean | null
	correct: boolean | null
}

const outputSchema = z.object({
	answer: z.boolean(),
	detail: z.object({ composite: z.number() })
})

/** The small questions of a combine task, in order, with the text Jev is asked. */
export function weightQuestions(task: Task): { key: string; text: string }[] {
	if (!('questions' in task.jev)) return []
	return Object.entries(task.jev.questions).map(([key, question]) => ({
		key,
		text: typeof question.instructions === 'string' ? question.instructions : key
	}))
}

export function defaultWeights(task: Task): Weights {
	return Object.fromEntries(weightQuestions(task).map(({ key }) => [key, DEFAULT_WEIGHT]))
}

/** True when no question counts, so no score can be built. */
export function weightsAreEmpty(weights: Weights): boolean {
	return Object.values(weights).every((weight) => weight <= 0)
}

/** Each review's composite under the user's weights, built by the runner's combine function. */
export function compositeRows(task: Task, jev: Recording, weights: Weights): CompositeRow[] {
	const args: CombineArgs = { weights }
	return task.items.flatMap((item) => {
		const event = jev.events.find((candidate) => candidate.itemId === item.id)
		if (!event) return []
		const result = combineResult(task, item, event, args)
		const output = outputSchema.safeParse(result.parsed)
		return [
			{
				itemId: item.id,
				composite: output.success ? output.data.detail.composite : null,
				verdict: output.success ? output.data.answer : null,
				correct: result.correct
			}
		]
	})
}
