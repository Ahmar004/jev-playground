import { z } from 'zod'
import type { Recording } from '@/content/recording-schema'
import type { Task, TaskItem } from '@/content/task-schema'
import { valueText } from '@/features/race/answer-text'
import { QUESTION_KINDS } from '@/lib/constants'
import { jevAnswerSchema } from '@/runner/parse'

const ITEM_ID = /^(.+)-(plain|tricked)$/
const jevAnswersSchema = z.record(z.string(), jevAnswerSchema)

export type TrickSide = {
	itemId: string
	text: string
	jevProbability: number | null
	jevRight: boolean | null
	llmYes: boolean | null
	llmRight: boolean | null
}

export type TrickPair = {
	id: string
	plain: TrickSide
	tricked: TrickSide
	// Jev got the tricky wording wrong; null when its answer did not parse.
	fooled: boolean | null
}

/** The user's guesses: true means "Jev will be fooled by the tricky wording". */
export type Guesses = Record<string, boolean>

function side(item: TaskItem, jev: Recording, opponent: Recording | undefined): TrickSide {
	const jevEvent = jev.events.find((event) => event.itemId === item.id)
	const answers = jevAnswersSchema.safeParse(jevEvent?.parsed)
	const answer = answers.success ? answers.data.answer : undefined
	const llmEvent = opponent?.events.find((event) => event.itemId === item.id)
	const llmYes = typeof llmEvent?.parsed === 'boolean' ? llmEvent.parsed : null
	return {
		itemId: item.id,
		text: valueText(item.state),
		jevProbability: answer?.type === QUESTION_KINDS.noul ? answer.noul : null,
		jevRight: jevEvent?.ok ? (jevEvent.correct ?? null) : null,
		llmYes,
		llmRight: llmEvent?.ok ? (llmEvent.correct ?? null) : null
	}
}

/** The task's items grouped into plain and tricky pairs by their ids (level 8), with the recorded results. */
export function trickPairs(
	task: Task,
	jev: Recording,
	opponent: Recording | undefined
): TrickPair[] {
	const plain = new Map<string, TaskItem>()
	const tricked = new Map<string, TaskItem>()
	for (const item of task.items) {
		const match = ITEM_ID.exec(item.id)
		if (!match?.[1]) continue
		;(match[2] === 'plain' ? plain : tricked).set(match[1], item)
	}
	return [...plain].flatMap(([id, plainItem]) => {
		const trickedItem = tricked.get(id)
		if (!trickedItem) return []
		const trickedSide = side(trickedItem, jev, opponent)
		return [
			{
				id,
				plain: side(plainItem, jev, opponent),
				tricked: trickedSide,
				fooled: trickedSide.jevRight === null ? null : !trickedSide.jevRight
			}
		]
	})
}

/** How many of the user's guesses matched what happened; pairs with no guess or no result are left out. */
export function guessesRight(pairs: TrickPair[], guesses: Guesses): number {
	return pairs.filter((pair) => pair.fooled !== null && guesses[pair.id] === pair.fooled).length
}
