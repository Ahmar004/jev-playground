import type { Level } from '@/content/level-schema'
import type { Recording } from '@/content/recording-schema'
import type { Task } from '@/content/task-schema'
import { CLAUDE_MODELS, DEFAULT_OPPONENT, RACERS } from '@/lib/constants'

export type Lineup = { jev: Recording | undefined; opponents: Recording[] }

// Opus, Sonnet, Haiku; any other model after them by id.
const MODEL_ORDER: readonly string[] = Object.values(CLAUDE_MODELS)

function modelRank(modelId: string): number {
	const index = MODEL_ORDER.indexOf(modelId)
	return index === -1 ? MODEL_ORDER.length : index
}

/** Jev's recording and the LLM recordings Jev can race, in picker order. */
export function raceLineup(recordings: Recording[]): Lineup {
	return {
		jev: recordings.find((recording) => recording.racer === RACERS.jev),
		opponents: recordings
			.filter((recording) => recording.racer === RACERS.llm)
			.sort(
				(a, b) => modelRank(a.modelId) - modelRank(b.modelId) || a.modelId.localeCompare(b.modelId)
			)
	}
}

/** Jev faces Opus 5.5 by default (DESIGN 1), else the first recorded LLM. */
export function defaultOpponentId(opponents: Recording[]): string | undefined {
	return (
		opponents.find((recording) => recording.modelId === DEFAULT_OPPONENT)?.modelId ??
		opponents[0]?.modelId
	)
}

// One race of a level: its task, title and recordings (a level with several tasks stacks them).
export type LevelStage = {
	task: Task
	title: string
	judged: boolean
	jev: Recording | undefined
	opponents: Recording[]
}

/** The level's races in order, each with the recordings that match its task. */
export function levelStages(level: Level, tasks: Task[], recordings: Recording[]): LevelStage[] {
	return level.tasks.flatMap((entry) => {
		const task = tasks.find((candidate) => candidate.id === entry.id)
		if (!task) return []
		const lineup = raceLineup(recordings.filter((recording) => recording.taskId === task.id))
		return [{ task, title: entry.title, judged: entry.judged, ...lineup }]
	})
}

/** The LLM models every race has a recording for, so one opponent choice fits all of them. */
export function sharedOpponentIds(stages: LevelStage[]): string[] {
	const [first, ...rest] = stages
	if (!first) return []
	return first.opponents
		.map((recording) => recording.modelId)
		.filter((modelId) =>
			rest.every((stage) => stage.opponents.some((recording) => recording.modelId === modelId))
		)
}
