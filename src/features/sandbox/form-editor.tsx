'use client'

import { Button } from '@/components/ui/button'
import { CloseIcon, PlusIcon } from '@/components/ui/icons'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/cn'
import { QUESTION_KINDS, type QuestionKind } from '@/lib/constants'
import {
	newQuestion,
	optionsText,
	structuredOf,
	textOf,
	withKind,
	withOptions,
	type SandboxDoc,
	type SandboxQuestion
} from './doc'
import { SyncedTextarea } from './synced-textarea'

const SELECT = cn(
	'border-border bg-surface text-text h-9 w-full rounded border px-3 text-sm',
	'focus-visible:outline-accent focus-visible:outline focus-visible:outline-2'
)

const KIND_LABELS: Record<QuestionKind, string> = {
	[QUESTION_KINDS.noul]: 'Noul (yes or no)',
	[QUESTION_KINDS.choice]: 'Choice (one of several)',
	[QUESTION_KINDS.score]: 'Score (a level on a scale)'
}
const KINDS = [QUESTION_KINDS.noul, QUESTION_KINDS.choice, QUESTION_KINDS.score] as const

function isKind(value: string): value is QuestionKind {
	return KINDS.some((kind) => kind === value)
}

const asText = (text: string) => textOf(structuredOf(text))
const asLines = (text: string) =>
	text
		.split('\n')
		.map((line) => line.trim())
		.filter((line) => line !== '')
		.join('\n')

function QuestionCard({
	entry,
	index,
	onChange,
	onRemove
}: {
	entry: SandboxQuestion
	index: number
	onChange: (entry: SandboxQuestion) => void
	onRemove: () => void
}) {
	const { question } = entry
	const prefix = `sandbox-q-${entry.id}`
	return (
		<fieldset className="border-border flex flex-col gap-3 rounded-lg border p-3">
			<legend className="text-text px-1 text-sm font-bold">Question {index + 1}</legend>
			<div className="grid gap-3 sm:grid-cols-2">
				<div className="flex flex-col gap-1">
					<Label htmlFor={`${prefix}-name`}>Name</Label>
					<Input
						id={`${prefix}-name`}
						value={entry.name}
						onChange={(event) => onChange({ ...entry, name: event.target.value })}
					/>
				</div>
				<div className="flex flex-col gap-1">
					<Label htmlFor={`${prefix}-kind`}>Answer type</Label>
					<select
						id={`${prefix}-kind`}
						className={SELECT}
						value={question.type}
						onChange={(event) => {
							if (isKind(event.target.value)) {
								onChange({ ...entry, question: withKind(question, event.target.value) })
							}
						}}
					>
						{KINDS.map((kind) => (
							<option key={kind} value={kind}>
								{KIND_LABELS[kind]}
							</option>
						))}
					</select>
				</div>
			</div>
			<SyncedTextarea
				id={`${prefix}-instructions`}
				label="Question"
				value={textOf(question.instructions)}
				normalize={asText}
				onValue={(text) =>
					onChange({ ...entry, question: { ...question, instructions: structuredOf(text) } })
				}
			/>
			{question.type !== QUESTION_KINDS.noul && (
				<SyncedTextarea
					id={`${prefix}-options`}
					label={
						question.type === QUESTION_KINDS.choice
							? 'Options, one per line (2 to 255)'
							: 'Levels from lowest to highest, one per line (2 to 10)'
					}
					value={optionsText(question)}
					normalize={asLines}
					onValue={(text) => onChange({ ...entry, question: withOptions(question, text) })}
				/>
			)}
			<div>
				<Button type="button" size="sm" variant="outline" onClick={onRemove}>
					<CloseIcon /> Remove question {index + 1}
				</Button>
			</div>
		</fieldset>
	)
}

/** The Form view (R48): a state and a list of questions, editing the same setup the JSON view shows. */
export function FormEditor({
	doc,
	onChange
}: {
	doc: SandboxDoc
	onChange: (doc: SandboxDoc) => void
}) {
	return (
		<div className="flex flex-col gap-3">
			<SyncedTextarea
				id="sandbox-state"
				label="State (the text or JSON Jev looks at)"
				className="min-h-28"
				value={textOf(doc.state)}
				normalize={asText}
				onValue={(text) => onChange({ ...doc, state: structuredOf(text) })}
				hint="Text that starts with { or [ and is valid JSON is sent as structured data."
			/>
			{doc.questions.map((entry, index) => (
				<QuestionCard
					key={entry.id}
					entry={entry}
					index={index}
					onChange={(next) =>
						onChange({
							...doc,
							questions: doc.questions.map((candidate) =>
								candidate.id === entry.id ? next : candidate
							)
						})
					}
					onRemove={() =>
						onChange({
							...doc,
							questions: doc.questions.filter((candidate) => candidate.id !== entry.id)
						})
					}
				/>
			))}
			<div>
				<Button
					type="button"
					variant="secondary"
					onClick={() => onChange({ ...doc, questions: [...doc.questions, newQuestion(doc)] })}
				>
					<PlusIcon /> Add a question
				</Button>
			</div>
		</div>
	)
}
