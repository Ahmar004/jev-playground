import type { ItemWords } from '@/content/game-schema'
import { answerQuestion, type Task } from '@/content/task-schema'
import { ScrollRegion } from '@/components/ui/scroll-region'
import { ItemInput } from '@/features/games/game-items'
import { OptionList, optionsOf } from '@/features/games/task-options'
import { valueText } from '@/features/race/answer-text'
import { fanOutQuestions } from './fan-out'

/**
 * What Jev and the LLM get for a preset: its input (Beginner mode; Developer mode edits it below),
 * the question and the options with their meanings, word for word as both racers get them (R92),
 * or a fan_out's list of questions. Shown before the run, so the answers make sense.
 */
export function ArenaBrief({
	task,
	words,
	showInput
}: {
	task: Task
	words: ItemWords
	showInput: boolean
}) {
	const item = task.items[0]
	const single = answerQuestion(task)
	const questions = fanOutQuestions(task)
	return (
		<section aria-labelledby="arena-brief-heading" className="flex flex-col gap-3">
			<h3 id="arena-brief-heading" className="text-text text-lg font-bold">
				What Jev and the LLM are asked
			</h3>
			<p className="text-text-muted text-sm">
				{questions
					? `Both get the same input and the same ${questions.length} yes or no questions about it. Jev answers all of them in one request; the LLM writes all ${questions.length} answers in one reply.`
					: 'Both get the same input, question and options, one call each.'}
			</p>
			{showInput && item && (
				<div className="flex flex-col gap-1">
					<p className="text-text-muted text-sm">Input</p>
					<ScrollRegion
						label="Input text"
						className="bg-surface-hover max-h-64 overflow-auto rounded"
					>
						<div className="p-3 text-sm wrap-anywhere whitespace-pre-wrap">
							<ItemInput item={item} />
						</div>
					</ScrollRegion>
				</div>
			)}
			{single && (
				<blockquote className="border-accent text-text border-l-4 pl-3 font-medium">
					{valueText(single.instructions)}
				</blockquote>
			)}
			{questions && (
				<ol className="border-accent text-text flex list-decimal flex-col gap-1 border-l-4 pl-8 text-sm">
					{questions.map((question) => (
						<li key={question.name}>{question.text}</li>
					))}
				</ol>
			)}
			<OptionList options={optionsOf(words, task)} />
		</section>
	)
}
