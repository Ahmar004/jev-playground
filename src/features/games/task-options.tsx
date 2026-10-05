import type { ItemWords } from '@/content/game-schema'
import { answerQuestion, type Task } from '@/content/task-schema'
import { valueText } from '@/features/race/answer-text'
import { QUESTION_KINDS } from '@/lib/constants'
import { optionLabel } from './scenes/scene-data'

export type TaskOption = { name: string; meaning: string | null }

/** The answers a racer may give, in the page's words, each with what it means when the task says. */
export function optionsOf(words: ItemWords, task: Task): TaskOption[] {
	const question = answerQuestion(task)
	switch (question?.type) {
		case QUESTION_KINDS.choice:
			return Object.entries(question.criteria).map(([key, meaning]) => ({
				name: optionLabel(key),
				meaning: meaning === null ? null : valueText(meaning)
			}))
		case QUESTION_KINDS.noul:
			return [
				{
					name: words.yes ?? 'Yes',
					meaning: question.criteria?.true === undefined ? null : valueText(question.criteria.true)
				},
				{
					name: words.no ?? 'No',
					meaning:
						question.criteria?.false === undefined ? null : valueText(question.criteria.false)
				}
			]
		case QUESTION_KINDS.score:
			return question.criteria.map((level, index) => ({
				name: String(index),
				meaning: valueText(level)
			}))
		default:
			return []
	}
}

/** The options as one line of names, or as a list with each meaning when the task gives them. */
export function OptionList({ options }: { options: readonly TaskOption[] }) {
	if (options.length === 0) return null
	if (options.every((option) => option.meaning === null)) {
		return (
			<p className="text-text text-sm">
				<span className="font-bold">Options: </span>
				{options.map((option) => option.name).join(', ')}
			</p>
		)
	}
	return (
		<ul className="flex flex-col gap-1 text-sm">
			{options.map((option) => (
				<li key={option.name} className="text-text">
					<span className="font-bold">{option.name}</span>
					{option.meaning !== null && (
						<span className="text-text-muted">{` - ${option.meaning}`}</span>
					)}
				</li>
			))}
		</ul>
	)
}
