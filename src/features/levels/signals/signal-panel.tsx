'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { SuccessIcon, WrongIcon } from '@/components/ui/icons'
import type { Recording } from '@/content/recording-schema'
import type { Task } from '@/content/task-schema'
import { valueText } from '@/features/race/answer-text'
import { racerName } from '@/features/race/racer-names'
import { cn } from '@/lib/cn'
import { RACERS } from '@/lib/constants'
import { signalRows } from './signal-rows'

const PERCENT = 100

function yesNo(value: boolean | null): string {
	if (value === null) return 'no answer'
	return value ? 'yes' : 'no'
}

function Verdict({ right }: { right: boolean | null }) {
	if (right === null) return null
	return (
		<span
			className={cn(
				'inline-flex items-center gap-1 font-bold',
				right ? 'text-success' : 'text-danger'
			)}
		>
			{right ? <SuccessIcon /> : <WrongIcon />}
			{right ? 'Right' : 'Wrong'}
		</span>
	)
}

/**
 * Level 7 Reveal: one email at a time, with each sign lit by Jev's probability,
 * the true answer and the LLM's yes or no. All ten signs came from one Jev request.
 */
export function SignalPanel({
	task,
	jev,
	opponent
}: {
	task: Task
	jev: Recording
	opponent: Recording | undefined
}) {
	const [itemId, setItemId] = useState(task.items[0]?.id)
	const item = task.items.find((candidate) => candidate.id === itemId)
	if (!item) return null
	const rows = signalRows(task, item.id, jev, opponent)
	const llmName = opponent ? racerName(RACERS.llm, opponent.modelId) : racerName(RACERS.llm)
	return (
		<section aria-labelledby="signals-heading" className="flex flex-col gap-4">
			<div className="flex flex-col gap-1">
				<h3 id="signals-heading" className="text-text text-xl font-bold">
					Every sign, one email at a time
				</h3>
				<p className="text-text-muted">
					A sign lights up when Jev&apos;s probability is 50% or more. Jev answered all ten in one
					request.
				</p>
			</div>
			<div role="group" aria-label="Choose an email" className="flex flex-wrap gap-2">
				{task.items.map((candidate, index) => (
					<Button
						key={candidate.id}
						type="button"
						size="sm"
						variant={candidate.id === item.id ? 'primary' : 'outline'}
						aria-pressed={candidate.id === item.id}
						onClick={() => setItemId(candidate.id)}
					>
						Email {index + 1}
					</Button>
				))}
			</div>
			<p className="bg-surface border-border text-text rounded-lg border p-3 text-sm break-words whitespace-pre-wrap">
				{valueText(item.state)}
			</p>
			<ul className="flex flex-col gap-2">
				{rows.map((row) => (
					<li
						key={row.key}
						className={cn(
							'border-border flex flex-col gap-1 rounded-lg border p-3 text-sm',
							row.lit && 'bg-surface-hover border-accent'
						)}
					>
						<p className="text-text font-bold">{row.text}</p>
						<div className="flex flex-wrap items-center gap-x-4 gap-y-1">
							<span className="text-text tabular-nums">
								Jev:{' '}
								{row.probability === null
									? 'no answer'
									: `${Math.round(row.probability * PERCENT)}%`}{' '}
								({row.lit ? 'lit' : 'not lit'})
							</span>
							<span className="text-text-muted">True answer: {yesNo(row.truth)}</span>
							<Verdict
								right={row.lit === null || row.truth === null ? null : row.lit === row.truth}
							/>
						</div>
						<div className="flex flex-wrap items-center gap-x-4 gap-y-1">
							<span className="text-text-muted">
								{llmName}: {yesNo(row.llmYes)}
							</span>
							<Verdict
								right={row.llmYes === null || row.truth === null ? null : row.llmYes === row.truth}
							/>
						</div>
						<div className="bg-border h-2 w-full overflow-hidden rounded-full" role="presentation">
							<div
								className="bg-accent h-full"
								style={{ width: `${Math.round((row.probability ?? 0) * PERCENT)}%` }}
							/>
						</div>
					</li>
				))}
			</ul>
		</section>
	)
}
