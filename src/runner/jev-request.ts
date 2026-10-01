import {
	linesOf,
	type Question,
	type RawQuestion,
	type Task,
	type TaskItem
} from '@/content/task-schema'
import { JEV_MODEL_ALIAS, QUESTION_KINDS } from '@/lib/constants'
import type { JevRequestBody } from './types'

const LINE_KEY_PREFIX = 'line_'

export function lineKey(lineNumber: number): string {
	return `${LINE_KEY_PREFIX}${lineNumber}`
}

export function lineNumberFromKey(key: string): number | null {
	if (!key.startsWith(LINE_KEY_PREFIX)) return null
	const lineNumber = Number(key.slice(LINE_KEY_PREFIX.length))
	return Number.isInteger(lineNumber) && lineNumber > 0 ? lineNumber : null
}

/** The questions Jev gets for this item: raw, one Noul per line, the item's own, or the task's. */
export function jevQuestions(task: Task, item: TaskItem): Record<string, Question | RawQuestion> {
	const { jev } = task
	if ('raw' in jev) return jev.raw
	if ('perLine' in jev) {
		const lines = linesOf(item.state)
		if (!lines) throw new Error(`Item ${item.id} of ${task.id} has no lines`)
		const { instructions, criteria } = jev.perLine
		return Object.fromEntries(
			lines.map((line, index): [string, Question] => [
				lineKey(index + 1),
				{
					type: QUESTION_KINDS.noul,
					instructions: { line, question: instructions },
					...(criteria ? { criteria } : {})
				}
			])
		)
	}
	return item.questions ?? jev.questions
}

/** The exact TypeSafe body for one item (DESIGN 3.2). */
export function buildJevRequest(task: Task, item: TaskItem): JevRequestBody {
	return { model: JEV_MODEL_ALIAS, state: item.state, questions: jevQuestions(task, item) }
}
