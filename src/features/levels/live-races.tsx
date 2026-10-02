'use client'

import { LiveSetupPanel } from '@/features/race/live-setup-panel'
import { RaceStage, type RaceResult } from '@/features/race/race-stage'
import type { RaceState } from '@/features/race/race-state'
import { useLiveSetup } from '@/features/race/use-live-config'
import type { CombineArgs } from '@/runner/code/combine-fns'
import type { LevelStage } from './lineup'

/**
 * Developer mode's Play: the same races, run live with the user's keys. The
 * recordings only name the racers; every number here comes from real calls.
 */
export function LiveRaces({
	stages,
	combineArgs,
	showHeadings,
	onUseBeginner,
	scene,
	onFinished
}: {
	stages: LevelStage[]
	combineArgs?: CombineArgs
	showHeadings: boolean
	onUseBeginner: () => void
	scene?: (perRacer: RaceState) => React.ReactNode
	onFinished?: (results: RaceResult[]) => void
}) {
	const setup = useLiveSetup()
	return (
		<>
			<LiveSetupPanel setup={setup} />
			{setup.config &&
				stages.map((stage) => {
					const opponent = stage.opponents[0]
					if (!stage.jev || !opponent) return null
					return (
						<div key={stage.task.id} className="flex flex-col gap-3">
							{showHeadings && <h3 className="text-text text-xl font-bold">{stage.title}</h3>}
							<RaceStage
								// A new model starts a fresh race.
								key={setup.config?.llmModelId}
								task={stage.task}
								jev={stage.jev}
								opponent={opponent}
								combineArgs={combineArgs}
								live={setup.config ?? undefined}
								onUseBeginner={onUseBeginner}
								scene={scene}
								onFinished={onFinished}
							/>
						</div>
					)
				})}
		</>
	)
}
