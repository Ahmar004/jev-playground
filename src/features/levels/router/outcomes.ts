import type { Recording } from '@/content/recording-schema'
import type { LevelStage } from '@/features/levels/lineup'
import { RACERS } from '@/lib/constants'
import type { RouterCard, RouterTool } from '@/content/level-schema'
import { ROUTER_TOOLS } from '@/content/level-schema'
import type { ItemResult } from '@/runner/types'

export type ToolOutcome = {
	tool: RouterTool
	modelId: string | undefined
	// The recorded or runner result; null when the tool has no way to do the job.
	result: ItemResult | null
	// Why there is no result.
	missing: string | null
}

export const CODE_HAS_NO_RULE = 'Code has no rule for this job.'
export const NOT_RECORDED = 'No result was recorded.'

export function isRouterTool(value: string): value is RouterTool {
	return ROUTER_TOOLS.some((tool) => tool === value)
}

/** What each tool did on one card: Jev and the LLM from their recordings, Code from the runner. */
export function toolOutcomes(
	stage: LevelStage,
	opponentId: string | undefined,
	codeResults: Record<string, ItemResult>
): ToolOutcome[] {
	const itemId = stage.task.items[0]?.id
	const opponent = stage.opponents.find((recording) => recording.modelId === opponentId)
	const recorded = (recording: Recording | undefined): ItemResult | undefined =>
		recording?.events.find((event) => event.itemId === itemId)
	const jevResult = recorded(stage.jev)
	const llmResult = recorded(opponent)
	const codeResult = stage.task.code ? codeResults[stage.task.id] : undefined
	return [
		{
			tool: RACERS.jev,
			modelId: stage.jev?.modelId,
			result: jevResult ?? null,
			missing: jevResult ? null : NOT_RECORDED
		},
		{
			tool: RACERS.llm,
			modelId: opponent?.modelId,
			result: llmResult ?? null,
			missing: llmResult ? null : NOT_RECORDED
		},
		{
			tool: RACERS.code,
			modelId: undefined,
			result: codeResult ?? null,
			missing: codeResult ? null : stage.task.code ? NOT_RECORDED : CODE_HAS_NO_RULE
		}
	]
}

export type Assignments = Record<string, RouterTool>

/** How many cards the user sent to the tool that suits them best. */
export function rightToolCount(cards: RouterCard[], assignments: Assignments): number {
	return cards.filter((card) => assignments[card.taskId] === card.best).length
}
