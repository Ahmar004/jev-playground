'use client'

import { useState } from 'react'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { LiveSetupPanel } from '@/features/race/live-setup-panel'
import { useLiveSetup } from '@/features/race/use-live-config'
import { cn } from '@/lib/cn'
import { QUESTION_KINDS } from '@/lib/constants'
import {
	buildCustomTask,
	CUSTOM_KIND_LABELS,
	CUSTOM_KINDS,
	withEditedState,
	type CustomKind
} from './custom-task'
import { LivePanel } from './live-panel'
import type { ArenaPresetView } from './snapshot'

const SELECT = cn(
	'border-border bg-surface text-text h-9 w-full rounded border px-3 text-sm',
	'focus-visible:outline-accent focus-visible:outline focus-visible:outline-2'
)

function isCustomKind(value: string): value is CustomKind {
	return CUSTOM_KINDS.some((kind) => kind === value)
}

/** Developer mode on a preset: edit its input, pick the LLM from your own key's models, run live (R41, R42). */
export function PresetDeveloperPanel({
	view,
	onUseBeginner
}: {
	view: ArenaPresetView
	onUseBeginner: () => void
}) {
	const setup = useLiveSetup()
	const [text, setText] = useState(view.state)
	return (
		<div className="flex flex-col gap-4">
			<LiveSetupPanel setup={setup} />
			{setup.config && (
				<LivePanel
					config={setup.config}
					title={view.preset.title}
					presetId={view.preset.id}
					unchangedState={view.state}
					buildTask={() => withEditedState(view.task, text)}
					onUseBeginner={onUseBeginner}
				>
					<div className="flex flex-col gap-1">
						<Label htmlFor="arena-input">Input (you can edit it)</Label>
						<Textarea
							id="arena-input"
							className="min-h-32 font-mono"
							value={text}
							onChange={(event) => setText(event.target.value)}
						/>
						<p className="text-text-muted text-xs">
							An edited input has no stored answer, so it shows &quot;not scored&quot;.
						</p>
					</div>
				</LivePanel>
			)}
		</div>
	)
}

/** Developer mode's own task: some text and one question, run live (R41). */
export function CustomDeveloperPanel({ onUseBeginner }: { onUseBeginner: () => void }) {
	const setup = useLiveSetup()
	const [kind, setKind] = useState<CustomKind>(QUESTION_KINDS.noul)
	const [state, setState] = useState('')
	const [question, setQuestion] = useState('')
	const [options, setOptions] = useState('')
	const needsOptions = kind !== QUESTION_KINDS.noul
	return (
		<div className="flex flex-col gap-4">
			<LiveSetupPanel setup={setup} />
			{setup.config && (
				<LivePanel
					config={setup.config}
					title="Custom task"
					buildTask={() => buildCustomTask({ kind, state, question, options })}
					onUseBeginner={onUseBeginner}
				>
					<div className="flex flex-col gap-1">
						<Label htmlFor="custom-kind">Answer type</Label>
						<select
							id="custom-kind"
							className={SELECT}
							value={kind}
							onChange={(event) => {
								if (isCustomKind(event.target.value)) setKind(event.target.value)
							}}
						>
							{CUSTOM_KINDS.map((option) => (
								<option key={option} value={option}>
									{CUSTOM_KIND_LABELS[option]}
								</option>
							))}
						</select>
					</div>
					<div className="flex flex-col gap-1">
						<Label htmlFor="custom-state">Text to look at</Label>
						<Textarea
							id="custom-state"
							className="min-h-24"
							value={state}
							onChange={(event) => setState(event.target.value)}
						/>
					</div>
					<div className="flex flex-col gap-1">
						<Label htmlFor="custom-question">Question</Label>
						<Textarea
							id="custom-question"
							value={question}
							onChange={(event) => setQuestion(event.target.value)}
						/>
					</div>
					{needsOptions && (
						<div className="flex flex-col gap-1">
							<Label htmlFor="custom-options">
								{kind === QUESTION_KINDS.choice
									? 'Options, one per line'
									: 'Levels from lowest to highest, one per line (2 to 10)'}
							</Label>
							<Textarea
								id="custom-options"
								value={options}
								onChange={(event) => setOptions(event.target.value)}
							/>
						</div>
					)}
					<p className="text-text-muted text-xs">
						A custom task has no stored answer, so it shows &quot;not scored&quot;.
					</p>
				</LivePanel>
			)}
		</div>
	)
}
