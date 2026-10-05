import type { Task } from '@/content/task-schema'
import { OUTCOME_COPY } from '@/features/levels/item-results'
import { racerName } from '@/features/race/racer-names'
import { RacerTag } from '@/features/race/racer-tag'
import { cn } from '@/lib/cn'
import { ITEM_OUTCOMES, type ItemOutcome } from '@/lib/constants'
import { fanOutAnswer, fanOutQuestions, type FanOutAnswer } from './fan-out'
import type { ArenaSide } from './snapshot'

const PERCENT = 100

function outcomeOf(answer: FanOutAnswer | null, right: boolean | undefined): ItemOutcome {
	if (answer === null) return ITEM_OUTCOMES.unparsed
	if (right === undefined) return ITEM_OUTCOMES.unscored
	return answer.yes === right ? ITEM_OUTCOMES.right : ITEM_OUTCOMES.wrong
}

function answerText(answer: FanOutAnswer | null): string {
	if (answer === null) return 'No valid answer'
	const word = answer.yes ? 'Yes' : 'No'
	return answer.probability === null
		? word
		: `${word} (${Math.round(answer.probability * PERCENT)}% likely yes)`
}

/**
 * A fan_out result question by question: each question, its right answer and what each racer
 * said, so a reader sees which signals each one got right, not only the overall badge.
 */
export function FanOutTable({ task, sides }: { task: Task; sides: readonly ArenaSide[] }) {
	const questions = fanOutQuestions(task)
	const label = task.items[0]?.label
	if (!questions || sides.length === 0) return null
	const rightOf = (name: string) =>
		typeof label === 'object' && label !== null && !Array.isArray(label) ? label[name] : undefined
	const tallies = sides.map((side) => ({
		side,
		right: questions.filter(
			(question) =>
				outcomeOf(fanOutAnswer(side.racer, side.result, question.name), rightOf(question.name)) ===
				ITEM_OUTCOMES.right
		).length
	}))
	return (
		<section
			aria-labelledby="fan-out-heading"
			className="bg-surface border-border shadow-card flex flex-col gap-3 rounded-lg border p-4"
		>
			<h3 id="fan-out-heading" className="text-text text-lg font-bold">
				Question by question
			</h3>
			<p className="text-text-muted text-sm">
				{tallies
					.map(
						({ side, right }) =>
							`${racerName(side.racer, side.modelId)}: ${right} of ${questions.length} right`
					)
					.join('. ')}
				.
			</p>
			<ol className="flex flex-col gap-3">
				{questions.map((question, index) => {
					const right = rightOf(question.name)
					return (
						<li key={question.name} className="border-border flex flex-col gap-2 border-t pt-3">
							<p className="text-text">
								<span className="text-text-muted mr-1 font-bold">{index + 1}.</span>
								{question.text}
							</p>
							<div className="grid gap-3 text-sm sm:grid-cols-3">
								<p className="text-text-muted">
									Right answer:{' '}
									<span className="text-text font-bold">
										{right === undefined ? 'not scored' : right ? 'Yes' : 'No'}
									</span>
								</p>
								{sides.map((side) => {
									const answer = fanOutAnswer(side.racer, side.result, question.name)
									const copy = OUTCOME_COPY[outcomeOf(answer, right)]
									return (
										<div key={side.racer} className="flex flex-col gap-1">
											<RacerTag racer={side.racer} modelId={side.modelId} />
											<p className="text-text">{answerText(answer)}</p>
											<p className={cn('inline-flex items-center gap-1 font-bold', copy.tone)}>
												<copy.Icon />
												{copy.text}
											</p>
										</div>
									)
								})}
							</div>
						</li>
					)
				})}
			</ol>
		</section>
	)
}
