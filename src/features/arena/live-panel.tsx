'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { AlertIcon } from '@/components/ui/icons'
import type { ItemWords } from '@/content/game-schema'
import type { Task } from '@/content/task-schema'
import { answerLabel } from '@/features/games/item-view'
import { providerErrorMessage } from '@/features/keys/error-copy'
import { valueText } from '@/features/race/answer-text'
import type { LiveConfig } from '@/features/race/live-config'
import { JEV_MODEL_ALIAS, MODES, RACERS } from '@/lib/constants'
import type { TaskBuild } from './custom-task'
import { FanOutTable } from './fan-out-table'
import { fanOutQuestions } from './fan-out'
import { PendingCard, SideCard } from './side-card'
import { ShareControls } from './share-controls'
import {
	arenaSnapshotSchema,
	questionText,
	stateText,
	type ArenaRacer,
	type ArenaSide,
	type ArenaSnapshot
} from './snapshot'
import { useArenaLive } from './use-arena-live'

const RACER_ORDER: ArenaRacer[] = [RACERS.jev, RACERS.llm]

/**
 * Developer mode's run: the user's inputs (children), a Run button, and the
 * two live results side by side. `buildTask` turns the inputs into the task
 * to run, or says what is wrong with them.
 */
export function LivePanel({
	config,
	title,
	presetId,
	unchangedState,
	buildTask,
	onUseBeginner,
	words,
	children
}: {
	config: LiveConfig
	title: string
	// A preset's words for its answers; a custom task shows answers as given.
	words?: ItemWords
	// Set for a preset; the share is "unchanged" while the input is still the preset's own.
	presetId?: string
	unchangedState?: string
	buildTask: () => TaskBuild
	onUseBeginner: () => void
	children: React.ReactNode
}) {
	const live = useArenaLive(config)
	const [inputError, setInputError] = useState<string | null>(null)

	const run = () => {
		const built = buildTask()
		if (!built.ok) {
			setInputError(built.error)
			return
		}
		setInputError(null)
		live.run(built.task)
	}

	const modelIds: Record<ArenaRacer, string> = {
		[RACERS.jev]: config.answered.jev ?? JEV_MODEL_ALIAS,
		[RACERS.llm]: config.answered.llm ?? config.llmModelId
	}
	const startedAt = live.ran?.startedAt ?? ''
	const sides: ArenaSide[] = RACER_ORDER.flatMap((racer) => {
		const result = live.results[racer]
		return result ? [{ racer, modelId: modelIds[racer], at: startedAt, result }] : []
	})
	const snapshot =
		live.status === 'done' ? snapshotOf(live.ran?.task, sides, title, presetId) : null
	const ranTask = live.ran?.task
	const label =
		words && ranTask ? (value: unknown) => answerLabel(words, ranTask, value) : undefined
	const expectedLabel = ranTask?.items[0]?.label
	const expected =
		expectedLabel === undefined ? null : label ? label(expectedLabel) : valueText(expectedLabel)
	const fanOut = ranTask !== undefined && fanOutQuestions(ranTask) !== null
	const edited =
		live.ran !== null && stateText(live.ran.task.items[0]?.state ?? '') !== unchangedState

	return (
		<div className="flex flex-col gap-4">
			<form
				className="flex flex-col gap-3"
				onSubmit={(event) => {
					event.preventDefault()
					run()
				}}
			>
				{children}
				{inputError && (
					<p role="alert" className="text-danger text-sm">
						{inputError}
					</p>
				)}
				<div className="flex flex-wrap items-center gap-3">
					<Button type="submit" disabled={live.status === 'running'}>
						{live.status === 'running' ? 'Running...' : 'Run live'}
					</Button>
					<p className="text-text-muted text-sm">
						Makes one call to Jev and one to your LLM, with your keys.
					</p>
				</div>
			</form>

			{live.failure && (
				<div
					role="alert"
					className="bg-surface border-danger text-text shadow-card flex flex-col gap-3 rounded-lg border p-4"
				>
					<p className="flex items-start gap-2">
						<AlertIcon className="text-danger mt-0.5 shrink-0" />
						<span>
							{providerErrorMessage(
								live.failure.kind,
								live.failure.racer === RACERS.llm ? config.llmProvider : config.jevProvider
							)}
						</span>
					</p>
					<div className="flex flex-wrap gap-2">
						<Button type="button" size="sm" onClick={run}>
							Retry
						</Button>
						<Button type="button" size="sm" variant="outline" onClick={onUseBeginner}>
							Use Beginner mode instead
						</Button>
					</div>
				</div>
			)}

			{live.status !== 'idle' && (
				<div className="grid gap-4 md:grid-cols-2" aria-live="polite">
					{RACER_ORDER.map((racer) => {
						const side = sides.find((candidate) => candidate.racer === racer)
						return side ? (
							<SideCard key={racer} side={side} mode={MODES.developer} label={label} />
						) : live.status === 'running' ? (
							<PendingCard key={racer} racer={racer} modelId={modelIds[racer]} />
						) : null
					})}
				</div>
			)}

			{live.status === 'done' && (
				<div className="flex flex-col gap-3">
					{fanOut && ranTask ? (
						<FanOutTable task={ranTask} sides={sides} />
					) : (
						expected !== null && (
							<p className="text-text">
								Expected answer: <span className="font-bold wrap-anywhere">{expected}</span>
							</p>
						)
					)}
					<div>
						<ShareControls
							request={snapshot ? { mode: MODES.developer, snapshot } : null}
							needsConsent={presetId === undefined || edited}
						/>
					</div>
				</div>
			)}
		</div>
	)
}

function expectedOf(task: Task): string | null {
	const label = task.items[0]?.label
	return label === undefined ? null : valueText(label)
}

function snapshotOf(
	task: Task | undefined,
	sides: ArenaSide[],
	title: string,
	presetId: string | undefined
): ArenaSnapshot | null {
	const item = task?.items[0]
	if (!task || !item || sides.length === 0) return null
	const expected = expectedOf(task)
	const parsed = arenaSnapshotSchema.safeParse({
		mode: MODES.developer,
		title,
		...(presetId ? { presetId } : {}),
		question: questionText(task),
		state: stateText(item.state),
		...(expected === null ? {} : { expected }),
		sides
	})
	return parsed.success ? parsed.data : null
}
