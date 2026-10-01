'use client'

import { Button } from '@/components/ui/button'
import { ArrowRightIcon, InfoIcon } from '@/components/ui/icons'
import type { Recording } from '@/content/recording-schema'
import type { Task } from '@/content/task-schema'
import { OpponentPicker } from '@/features/race/opponent-picker'
import { RaceStage } from '@/features/race/race-stage'

export function NotRecorded({ children }: { children: React.ReactNode }) {
	return (
		<p className="bg-surface border-border text-text flex items-center gap-2 rounded-lg border p-4">
			<InfoIcon />
			{children}
		</p>
	)
}

/** Play: Jev races the picked opponent from the recordings (spec 6.1). */
export function PlayStep({
	task,
	jev,
	opponents,
	opponentId,
	onOpponentChange,
	onReveal
}: {
	task: Task
	jev: Recording | undefined
	opponents: Recording[]
	opponentId: string | undefined
	onOpponentChange: (modelId: string) => void
	onReveal: () => void
}) {
	const opponent = opponents.find((recording) => recording.modelId === opponentId)
	if (!jev || !opponent) {
		return (
			<NotRecorded>This race has not been recorded yet, so there is nothing to replay.</NotRecorded>
		)
	}
	return (
		<section aria-labelledby="play-heading" className="flex flex-col gap-4">
			<div className="flex flex-wrap items-center justify-between gap-3">
				<h2 id="play-heading" className="text-text text-2xl font-bold">
					Race
				</h2>
				<OpponentPicker
					value={opponent.modelId}
					options={opponents.map((recording) => recording.modelId)}
					onChange={onOpponentChange}
				/>
			</div>
			<RaceStage key={opponent.modelId} task={task} jev={jev} opponent={opponent} />
			<div>
				<Button type="button" onClick={onReveal}>
					See the result
					<ArrowRightIcon />
				</Button>
			</div>
		</section>
	)
}
