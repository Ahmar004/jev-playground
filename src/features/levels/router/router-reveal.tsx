import type { RouterCard } from '@/content/level-schema'
import type { ItemResult } from '@/runner/types'
import type { LevelStage } from '../lineup'
import { liveToolOutcomes, toolOutcomes, type Assignments, type LiveRouterRun } from './outcomes'
import { RouterResults } from './router-results'

const SUBTITLE = 'text-text text-lg font-bold'

/**
 * Level 6's Reveal: the user's last finished live run, when there is one,
 * above the recorded results. Each result keeps its own mode label (R84).
 */
export function RouterReveal({
	cards,
	stages,
	assignments,
	codeResults,
	opponentId,
	liveRun
}: {
	cards: RouterCard[]
	stages: LevelStage[]
	assignments: Assignments
	codeResults: Record<string, ItemResult>
	opponentId: string | undefined
	liveRun: LiveRouterRun | null
}) {
	const recorded = (
		<RouterResults
			cards={cards}
			stages={stages}
			assignments={assignments}
			outcomesFor={(stage) => toolOutcomes(stage, opponentId, codeResults)}
			label={liveRun ? 'Recorded runs, for each card' : undefined}
		/>
	)
	if (!liveRun) return recorded
	return (
		<div className="flex flex-col gap-4">
			<h3 className={SUBTITLE}>Your live run</h3>
			<RouterResults
				cards={cards}
				stages={stages}
				assignments={assignments}
				outcomesFor={(stage) =>
					liveToolOutcomes(stage, liveRun.results[stage.task.id], liveRun, codeResults, false)
				}
				label="Your live run, for each card"
			/>
			<h3 className={SUBTITLE}>Recorded runs</h3>
			{recorded}
		</div>
	)
}
