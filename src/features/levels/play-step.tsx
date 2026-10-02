'use client'

import { Button } from '@/components/ui/button'
import { ArrowRightIcon, InfoIcon } from '@/components/ui/icons'
import { OpponentPicker } from '@/features/race/opponent-picker'
import { RaceStage } from '@/features/race/race-stage'
import type { CombineArgs } from '@/runner/code/combine-fns'
import type { LevelStage } from './lineup'

export function NotRecorded({ children }: { children: React.ReactNode }) {
	return (
		<p className="bg-surface border-border text-text flex items-center gap-2 rounded-lg border p-4">
			<InfoIcon />
			{children}
		</p>
	)
}

/**
 * Play: Jev races the picked opponent from the recordings (spec 6.1). A level
 * with several tasks stacks one race per task under a shared opponent picker.
 * `children` is the level's own widget, shown above the races (level 4).
 */
export function PlayStep({
	stages,
	opponentIds,
	opponentId,
	onOpponentChange,
	onReveal,
	combineArgs,
	hideRaces = false,
	children
}: {
	stages: LevelStage[]
	opponentIds: string[]
	opponentId: string | undefined
	onOpponentChange: (modelId: string) => void
	onReveal: () => void
	combineArgs?: CombineArgs
	// Level 6 replaces the races with its own widget.
	hideRaces?: boolean
	children?: React.ReactNode
}) {
	const ready =
		opponentId !== undefined &&
		stages.length > 0 &&
		stages.every(
			(stage) => stage.jev && stage.opponents.some((recording) => recording.modelId === opponentId)
		)
	if (!ready) {
		return (
			<NotRecorded>This race has not been recorded yet, so there is nothing to replay.</NotRecorded>
		)
	}
	return (
		<section aria-labelledby="play-heading" className="flex flex-col gap-6">
			<div className="flex flex-wrap items-center justify-between gap-3">
				<h2 id="play-heading" tabIndex={-1} className="text-text text-2xl font-bold">
					{children ? 'Play' : 'Race'}
				</h2>
				<OpponentPicker value={opponentId} options={opponentIds} onChange={onOpponentChange} />
			</div>
			{children}
			{!hideRaces &&
				stages.map((stage) => {
					const opponent = stage.opponents.find((recording) => recording.modelId === opponentId)
					if (!stage.jev || !opponent) return null
					return (
						<div key={stage.task.id} className="flex flex-col gap-3">
							{(stages.length > 1 || children) && (
								<h3 className="text-text text-xl font-bold">{stage.title}</h3>
							)}
							<RaceStage
								key={opponent.modelId}
								task={stage.task}
								jev={stage.jev}
								opponent={opponent}
								combineArgs={combineArgs}
							/>
						</div>
					)
				})}
			<div>
				<Button type="button" onClick={onReveal}>
					See the result
					<ArrowRightIcon />
				</Button>
			</div>
		</section>
	)
}
