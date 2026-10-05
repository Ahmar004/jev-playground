'use client'

import type { RouterCard, RouterTool } from '@/content/level-schema'
import { liveModelId, liveRunners, type LiveConfig } from '@/features/race/live-config'
import { LiveFailureAlert } from '@/features/race/live-failure-alert'
import { LiveSetupPanel } from '@/features/race/live-setup-panel'
import { useLiveSetup } from '@/features/race/use-live-config'
import { useRecordDevRun } from '@/features/race/use-record-dev-run'
import { RACE_LANES, RACE_STATUS, RACERS } from '@/lib/constants'
import type { ItemResult } from '@/runner/types'
import type { LevelStage } from '../lineup'
import { liveToolOutcomes, type Assignments, type LiveRouterRun } from './outcomes'
import { RouterGame } from './router-game'
import { RouterResults } from './router-results'
import { useLiveRouter, type LiveRouter } from './use-live-router'

type Props = {
	cards: RouterCard[]
	stages: LevelStage[]
	assignments: Assignments
	codeResults: Record<string, ItemResult>
	onAssign: (taskId: string, tool: RouterTool | null) => void
	// The first sort goes to the server for its badge, as in Beginner mode.
	onRun: () => void
	// A finished run, kept for Reveal; a run stopped by a failure is not reported.
	onLiveRun: (run: LiveRouterRun) => void
	onUseBeginner: () => void
}

function runNote(router: LiveRouter, ready: boolean): string | undefined {
	if (!ready) return undefined
	if (router.status === RACE_STATUS.running)
		return `Running live: ${router.done} of ${router.total} calls done.`
	if (router.status === RACE_STATUS.idle)
		return `Every card runs live: Jev and the LLM make one call each, ${RACE_LANES} at a time per tool. Code runs in your browser for free.`
	return undefined
}

function LiveRun({ config, ...props }: Props & { config: LiveConfig | null }) {
	const devRun = useRecordDevRun()
	const router = useLiveRouter({
		tasks: props.stages.map((stage) => stage.task),
		onFinished: ({ results, startedAt }) => {
			devRun.record()
			if (!config) return
			props.onLiveRun({
				results,
				startedAt,
				jevModelId: liveModelId(config, RACERS.jev),
				llmModelId: liveModelId(config, RACERS.llm)
			})
		}
	})
	function run(): void {
		if (!config) return
		props.onRun()
		router.start((task) => liveRunners(task, config))
	}
	const running = router.status === RACE_STATUS.running
	return (
		<>
			<RouterGame
				cards={props.cards}
				assignments={props.assignments}
				onAssign={props.onAssign}
				onRun={run}
				blocked={!config || running}
				note={runNote(router, config !== null)}
			/>
			{config && router.startedAt && (
				<RouterResults
					cards={props.cards}
					stages={props.stages}
					assignments={props.assignments}
					outcomesFor={(stage) =>
						liveToolOutcomes(
							stage,
							router.results[stage.task.id],
							{
								startedAt: router.startedAt ?? '',
								jevModelId: liveModelId(config, RACERS.jev),
								llmModelId: liveModelId(config, RACERS.llm)
							},
							props.codeResults,
							running
						)
					}
				/>
			)}
			{config && router.failure && (
				<LiveFailureAlert
					failure={router.failure}
					jevProvider={config.jevProvider}
					llmProvider={config.llmProvider}
					onRetry={run}
					onUseBeginner={props.onUseBeginner}
				/>
			)}
		</>
	)
}

/**
 * Level 6 in Developer mode (R14): the same sort, then every card runs live
 * with the user's keys. The recordings are not used; every number shown comes
 * from this run, labelled with the mode, model id and run time.
 */
export function RouterLivePlay(props: Props) {
	const setup = useLiveSetup()
	return (
		<>
			<LiveSetupPanel setup={setup} />
			{/* A new model starts a fresh run, so no result carries another model's label. */}
			<LiveRun key={setup.config?.llmModelId ?? 'no-keys'} config={setup.config} {...props} />
		</>
	)
}
