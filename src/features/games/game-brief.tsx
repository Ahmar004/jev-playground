import { Card } from '@/components/ui/card'
import type { ItemWords } from '@/content/game-schema'
import { answerQuestion, type Task } from '@/content/task-schema'
import { valueText } from '@/features/race/answer-text'
import { fanOutQuestions } from '@/features/arena/fan-out'
import { TASK_KINDS } from '@/lib/constants'
import { optionLabel } from './scenes/scene-data'
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
	const questions = fanOutQuestions(task)
	return (
		<Card role="region" aria-labelledby="brief-heading" className="flex flex-col gap-3 p-5">
			<h2 id="brief-heading" className="text-text text-xl font-bold">
				What Jev and the LLM are asked
			</h2>
			<p className="text-text-muted">
				{task.kind === TASK_KINDS.findLines
					? `Both get the same question for each of the ${count}. Jev answers it for every line, one yes or no per line; the LLM reads the whole document and lists the lines.`
					: questions
						? `Both get the same ${questions.length} yes or no questions for each of the ${count}, one call per item: Jev answers all of them in one request, and the LLM writes all ${questions.length} answers in one reply.`
						: `Both get the same question and the same options for each of the ${count}, one call per item.`}
				{task.code && ' Code, a small program, answers the same items after the race.'}
				{task.combine &&
					" In the same call Jev also answers smaller questions about each item, and Code, a small program, turns those answers into Jev + Code's answer."}
			</p>
			{instructions !== undefined && (
				<blockquote className="border-accent text-text border-l-4 pl-3 font-medium">
					{valueText(instructions)}
				</blockquote>
			)}
			{questions && (
				<ol className="border-accent text-text flex list-decimal flex-col gap-1 border-l-4 pl-8 text-sm">
					{questions.map((question) => (
						<li key={question.name}>
							<span className="font-bold">{optionLabel(question.name)}</span>
							{`: ${question.text}`}
						</li>
					))}
				</ol>
			)}
			<OptionList options={optionsOf(words, task)} />
		</Card>
	)
}
