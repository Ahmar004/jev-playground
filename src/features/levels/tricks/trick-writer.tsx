'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { InfoIcon } from '@/components/ui/icons'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { itemOutcome } from '@/features/race/answer-text'
import { formatCost, formatDuration } from '@/features/race/format'
import { ModeLabel } from '@/features/race/mode-label'
import { cn } from '@/lib/cn'
import { ITEM_OUTCOMES, MODES } from '@/lib/constants'
import { OUTCOME_COPY } from '../item-results'
import { jevProbability, trickFooled } from './pairs'
import { TRICK_TEXT_MAX, type TrickAttempt, type TrickInput } from './use-live-trick'

const PERCENT = 100
const ANSWERS = [
	{ value: true, label: 'Yes' },
	{ value: false, label: 'No' }
] as const

function AttemptCard({ attempt, modelId }: { attempt: TrickAttempt; modelId: string }) {
	const { result } = attempt
	const fooled = trickFooled(result)
	const outcome = itemOutcome(result)
	const copy = OUTCOME_COPY[outcome]
	const probability = jevProbability(result.parsed)
	return (
		<li className="bg-surface border-border shadow-card flex flex-col gap-2 rounded-lg border p-4">
			<p className={cn('text-lg font-bold', fooled ? 'text-success' : 'text-text')}>
				{fooled ? 'You fooled Jev' : 'Jev saw through it'}
			</p>
			<p className="text-text text-sm break-words whitespace-pre-wrap">{attempt.text}</p>
			<p className="text-text-muted text-sm">Your right answer: {attempt.label ? 'yes' : 'no'}</p>
			<p className="text-text text-sm tabular-nums">
				Jev: {probability === null ? 'no answer' : `${Math.round(probability * PERCENT)}% yes`}
			</p>
			<p className={cn('inline-flex items-center gap-1 text-sm font-bold', copy.tone)}>
				<copy.Icon />
				{copy.text}
			</p>
			{(outcome === ITEM_OUTCOMES.unparsed || outcome === ITEM_OUTCOMES.failed) && (
				<>
					<p className="text-text-muted text-sm">
						{outcome === ITEM_OUTCOMES.failed
							? 'Jev turned the request down, so it counts as a miss. Its reply:'
							: "Jev's reply could not be read as an answer, so it counts as a miss. Its reply:"}
					</p>
					<p className="bg-surface-hover text-text rounded p-2 font-mono text-xs break-words whitespace-pre-wrap">
						{result.raw || 'Empty reply'}
					</p>
				</>
			)}
			<p className="text-text-muted text-xs tabular-nums">
				{formatDuration(result.latencyMs)} - {formatCost(result.costUsd)}
			</p>
			<ModeLabel mode={MODES.developer} modelId={modelId} recordedAt={attempt.ranAt} />
		</li>
	)
}

/**
 * Level 8 in Developer mode: the user writes their own trick and says the
 * right answer; Jev answers live with the user's key. Pure: the call and the
 * attempts come from the parent.
 */
export function TrickWriter({
	question,
	missing,
	attempts,
	pending,
	modelId,
	onAsk,
	onOpenKeys,
	children
}: {
	question: string
	// Why Jev can't be asked yet (no TypeSafe key); null when ready.
	missing: string | null
	attempts: TrickAttempt[]
	pending: boolean
	modelId: string
	onAsk: (input: TrickInput) => void
	onOpenKeys: () => void
	// The failure alert, shown under the form.
	children?: React.ReactNode
}) {
	const [text, setText] = useState('')
	const [label, setLabel] = useState<boolean | null>(null)
	const blocked = missing !== null || pending
	const ready = !blocked && text.trim().length > 0 && label !== null
	return (
		<section aria-labelledby="trick-writer-heading" className="flex flex-col gap-4">
			<div className="flex flex-col gap-1">
				<h3 id="trick-writer-heading" className="text-text text-xl font-bold">
					Write your own trick
				</h3>
				<p className="text-text-muted">
					Jev is asked: &quot;{question}&quot; Write a message that makes Jev answer wrong, say what
					the right answer is, and Jev answers it live with your TypeSafe key.
				</p>
			</div>
			{missing !== null && (
				<div className="bg-surface border-border text-text shadow-card flex flex-wrap items-center justify-between gap-3 rounded-lg border p-4">
					<p className="flex items-center gap-2">
						<InfoIcon />
						{missing}
					</p>
					<Button type="button" size="sm" variant="outline" onClick={onOpenKeys}>
						Open Keys
					</Button>
				</div>
			)}
			<form
				className="bg-surface border-border shadow-card flex flex-col gap-3 rounded-lg border p-4"
				onSubmit={(event) => {
					event.preventDefault()
					if (!ready || label === null) return
					onAsk({ text, label })
				}}
			>
				<div className="flex flex-col gap-1">
					<Label htmlFor="trick-text">Your message</Label>
					<Textarea
						id="trick-text"
						value={text}
						maxLength={TRICK_TEXT_MAX}
						rows={3}
						onChange={(event) => setText(event.target.value)}
						onKeyDown={(event) => {
							// Enter submits; Shift+Enter adds a line.
							if (event.key === 'Enter' && !event.shiftKey) {
								event.preventDefault()
								event.currentTarget.form?.requestSubmit()
							}
						}}
					/>
				</div>
				<fieldset className="flex flex-wrap items-center gap-4">
					<legend className="text-text mb-1 text-sm font-bold">
						The right answer for your message
					</legend>
					{ANSWERS.map((answer) => (
						<label key={answer.label} className="text-text flex items-center gap-2">
							<input
								type="radio"
								name="trick-label"
								checked={label === answer.value}
								onChange={() => setLabel(answer.value)}
								className="accent-accent size-5"
							/>
							{answer.label}
						</label>
					))}
				</fieldset>
				<div className="flex flex-wrap items-center gap-3">
					<Button type="submit" disabled={!ready}>
						{pending ? 'Asking Jev...' : 'Ask Jev'}
					</Button>
					{pending && (
						<p role="status" className="text-text-muted text-sm">
							Jev is reading your message.
						</p>
					)}
				</div>
			</form>
			{children}
			{attempts.length > 0 && (
				<ol aria-label="Your tricks" className="flex flex-col gap-3">
					{attempts.map((attempt) => (
						<AttemptCard key={attempt.id} attempt={attempt} modelId={modelId} />
					))}
				</ol>
			)}
		</section>
	)
}
