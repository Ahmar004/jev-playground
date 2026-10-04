import type { Recording } from '@/content/recording-schema'
import type { LevelStage } from '@/features/levels/lineup'
import { MODES, RACERS, type Mode } from '@/lib/constants'
import type { RouterCard, RouterTool } from '@/content/level-schema'
import { ROUTER_TOOLS } from '@/content/level-schema'
import type { ItemResult } from '@/runner/types'
import type { LiveCardResults } from './use-live-router'

// Where a result came from, for its mode label (R13, R84): a recording's date or a live run's start.
export type OutcomeSource = { mode: Mode; at: string }

export type ToolOutcome = {
	tool: RouterTool
	modelId: string | undefined
	// The recorded or runner result; null when the tool has no way to do the job.
	result: ItemResult | null
	// Why there is no result.
	missing: string | null
	// Null for Code, which has no model and runs in the browser.
	source: OutcomeSource | null
}

export const CODE_HAS_NO_RULE = 'Code has no rule for this job.'
export const NOT_RECORDED = 'No result was recorded.'
export const LIVE_PENDING = 'Waiting for the live call...'
export const LIVE_NOT_RUN = 'Not run: the live run stopped first.'

export function isRouterTool(value: string): value is RouterTool {
	return ROUTER_TOOLS.some((tool) => tool === value)
}

function codeOutcome(stage: LevelStage, codeResults: Record<string, ItemResult>): ToolOutcome {
	const result = stage.task.code ? codeResults[stage.task.id] : undefined
	return {
		tool: RACERS.code,
		modelId: undefined,
		result: result ?? null,
		missing: result ? null : stage.task.code ? NOT_RECORDED : CODE_HAS_NO_RULE,
		source: null
	}
}

/** What each tool did on one card: Jev and the LLM from their recordings, Code from the runner. */
export function toolOutcomes(
	stage: LevelStage,
	opponentId: string | undefined,
	codeResults: Record<string, ItemResult>
): ToolOutcome[] {
	const itemId = stage.task.items[0]?.id
	const opponent = stage.opponents.find((recording) => recording.modelId === opponentId)
	const recorded = (tool: RouterTool, recording: Recording | undefined): ToolOutcome => {
		const result = recording?.events.find((event) => event.itemId === itemId)
		return {
			tool,
			modelId: recording?.modelId,
			result: result ?? null,
			missing: result ? null : NOT_RECORDED,
			source: recording ? { mode: MODES.beginner, at: recording.recordedAt } : null
		}
	}
	return [
		recorded(RACERS.jev, stage.jev),
		recorded(RACERS.llm, opponent),
		codeOutcome(stage, codeResults)
	]
}

// A live run's start and the models that answered it.
export type LiveRunInfo = { startedAt: string; jevModelId: string; llmModelId: string }

// A finished live run, kept for Reveal.
export type LiveRouterRun = LiveRunInfo & { results: LiveCardResults }

/** Developer mode: what Jev and the LLM did on one card in this live run, and Code from the runner. */
export function liveToolOutcomes(
	stage: LevelStage,
	live: LiveCardResults[string] | undefined,
	run: LiveRunInfo,
	codeResults: Record<string, ItemResult>,
	running: boolean
): ToolOutcome[] {
	const source: OutcomeSource = { mode: MODES.developer, at: run.startedAt }
	const outcome = (tool: typeof RACERS.jev | typeof RACERS.llm, modelId: string): ToolOutcome => {
		const result = live?.[tool]
		return {
			tool,
			modelId,
			result: result ?? null,
			missing: result ? null : running ? LIVE_PENDING : LIVE_NOT_RUN,
			source
		}
	}
	return [
		outcome(RACERS.jev, run.jevModelId),
		outcome(RACERS.llm, run.llmModelId),
		codeOutcome(stage, codeResults)
	]
}

export type Assignments = Record<string, RouterTool>

/** How many cards the user sent to the tool that suits them best. */
export function rightToolCount(cards: RouterCard[], assignments: Assignments): number {
	return cards.filter((card) => assignments[card.taskId] === card.best).length
}
