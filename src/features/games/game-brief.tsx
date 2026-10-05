import { Card } from '@/components/ui/card'
import type { ItemWords } from '@/content/game-schema'
import { answerQuestion, type Task } from '@/content/task-schema'
import { valueText } from '@/features/race/answer-text'
import { TASK_KINDS } from '@/lib/constants'
import { OptionList, optionsOf } from './task-options'

/**
 * What Jev and the LLM are asked: the task's own instructions and answer options, which
 * both racers get word for word (R92), and how many items they get it for. Shown before
 * the race, so the scene and the item list make sense. Games and Arena batches use it.
 */
export function GameBrief({ words, task }: { words: ItemWords; task: Task }) {
	const perLine = 'perLine' in task.jev ? task.jev.perLine : null
	const instructions = perLine?.instructions ?? answerQuestion(task)?.instructions
	const count = `${task.items.length} ${words.plural}`
	return (
		<Card role="region" aria-labelledby="brief-heading" className="flex flex-col gap-3 p-5">
			<h2 id="brief-heading" className="text-text text-xl font-bold">
				What Jev and the LLM are asked
			</h2>
			<p className="text-text-muted">
				{task.kind === TASK_KINDS.findLines
					? `Both get the same question for each of the ${count}. Jev answers it for every line, one yes or no per line; the LLM reads the whole document and lists the lines.`
					: `Both get the same question and the same options for each of the ${count}, one call per item.`}
				{task.code && ' Code, a small program, answers the same items after the race.'}
			</p>
			{instructions !== undefined && (
				<blockquote className="border-accent text-text border-l-4 pl-3 font-medium">
					{valueText(instructions)}
				</blockquote>
			)}
			<OptionList options={optionsOf(words, task)} />
		</Card>
	)
}
