import { z } from 'zod'
import { cn } from '@/lib/cn'
import { ANSWER_KEY, QUESTION_KINDS, RACERS, type Racer } from '@/lib/constants'
import { RACER_STYLE } from '@/features/race/racer-style'
import { valueText } from '@/features/race/answer-text'
import { jevAnswerSchema, type JevAnswer } from '@/runner/parse'
import type { ItemResult } from '@/runner/types'

const PERCENT = 100
const jevAnswersSchema = z.record(z.string(), jevAnswerSchema)
const booleanMapSchema = z.record(z.string(), z.boolean())

function percent(value: number): string {
	return `${Math.round(value * PERCENT)}%`
}

/** One horizontal bar with its label and number, so the value never rests on color alone (R51). */
function Bar({
	label,
	value,
	highlighted,
	fill
}: {
	label: string
	value: number
	highlighted: boolean
	fill: string
}) {
	return (
		<li className="grid grid-cols-[minmax(0,1fr)_3rem] items-center gap-x-2 gap-y-1">
			<span
				className={cn(
					'text-sm wrap-anywhere',
					highlighted ? 'text-text font-bold' : 'text-text-muted'
				)}
			>
				{label}
			</span>
			<span className="text-text text-right text-sm tabular-nums">{percent(value)}</span>
			<span className="bg-surface-hover col-span-2 block h-2 overflow-hidden rounded-full">
				<span
					className={cn('block h-full rounded-full', highlighted ? fill : 'bg-text-faint')}
					style={{ width: percent(value) }}
				/>
			</span>
		</li>
	)
}

// Puts an answer in the page's words ("Same product", "Positive"); without it, answers show as stored.
export type AnswerLabel = (value: unknown) => string

function JevAnswerBlock({
	name,
	answer,
	showName,
	label
}: {
	name: string
	answer: JevAnswer
	showName: boolean
	label?: AnswerLabel
}) {
	const fill = RACER_STYLE[RACERS.jev].fill
	if (answer.type === QUESTION_KINDS.noul) {
		const yesWord = label?.(true)
		const yesText =
			yesWord && yesWord !== 'Yes' ? `Probability yes (${yesWord})` : 'Probability yes'
		return (
			<ul className="flex flex-col gap-2">
				<Bar
					label={showName ? `${name}: probability yes` : yesText}
					value={answer.noul}
					highlighted={answer.noul >= 0.5}
					fill={fill}
				/>
			</ul>
		)
	}
	const isChoice = answer.type === QUESTION_KINDS.choice
	// Jev's Score is a probability-weighted value such as 3.76, so its words come from the nearest level.
	const picked = isChoice ? answer.choice : String(Math.round(answer.score))
	const headline = isChoice
		? `Picked: ${label ? label(answer.choice) : answer.choice}`
		: `Score ${answer.score}: ${answer.legend[picked] ?? ''}`
	return (
		<div className="flex flex-col gap-2">
			<p className="text-text font-bold wrap-anywhere">{headline}</p>
			<ul className="flex flex-col gap-2" aria-label="Probability of each option">
				{Object.entries(answer.probabilities).map(([key, value]) => (
					<Bar key={key} label={key} value={value} highlighted={key === picked} fill={fill} />
				))}
			</ul>
			<p className="text-text-muted text-sm">Confidence: {percent(answer.confidence)}</p>
		</div>
	)
}

/** A racer's parsed answer as plain text, bars and numbers (R43, R86). Not for failed or unparsed results. */
export function AnswerView({
	racer,
	result,
	label
}: {
	racer: Racer
	result: ItemResult
	label?: AnswerLabel
}) {
	if (racer === RACERS.jev) {
		const answers = jevAnswersSchema.safeParse(result.parsed)
		if (answers.success) {
			const entries = Object.entries(answers.data)
			return (
				<div className="flex flex-col gap-3">
					{entries.map(([name, answer]) => (
						<JevAnswerBlock
							key={name}
							name={name}
							answer={answer}
							showName={entries.length > 1 || name !== ANSWER_KEY}
							label={label}
						/>
					))}
				</div>
			)
		}
	}
	const flags = booleanMapSchema.safeParse(result.parsed)
	if (flags.success) {
		return (
			<ul className="flex flex-col gap-1 text-sm">
				{Object.entries(flags.data).map(([name, value]) => (
					<li key={name} className="text-text wrap-anywhere">
						{name}: <span className="font-bold">{value ? 'yes' : 'no'}</span>
					</li>
				))}
			</ul>
		)
	}
	return (
		<p className="text-text font-bold wrap-anywhere">
			{label ? label(result.parsed) : valueText(result.parsed)}
		</p>
	)
}
