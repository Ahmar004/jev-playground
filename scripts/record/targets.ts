import { parseArgs } from 'node:util'
import { recordingSlug } from '@/content/recording-schema'
import type { Task } from '@/content/task-schema'
import { CLAUDE_MODELS, JEV_MODEL_ALIAS, RACERS, TASK_KINDS } from '@/lib/constants'

// Jev plus the three Claude models, in the order they are recorded (DESIGN 4.2).
// On the command line, "jev" names Jev.
export const RECORD_MODELS: readonly string[] = [
	RACERS.jev,
	CLAUDE_MODELS.haiku,
	CLAUDE_MODELS.sonnet,
	CLAUDE_MODELS.opus
]

export type CliArgs = { taskId: string | null; model: string | null; dryRun: boolean }

export function parseCliArgs(argv: string[]): CliArgs {
	const { values } = parseArgs({
		args: argv,
		options: {
			task: { type: 'string' },
			model: { type: 'string' },
			'dry-run': { type: 'boolean', default: false }
		},
		strict: true,
		allowPositionals: false
	})
	const model = values.model ?? null
	if (model !== null && !RECORD_MODELS.includes(model)) {
		throw new Error(`Unknown model "${model}". Use one of: ${RECORD_MODELS.join(', ')}`)
	}
	return { taskId: values.task ?? null, model, dryRun: values['dry-run'] }
}

export type Target = {
	taskId: string
	racer: typeof RACERS.jev | typeof RACERS.llm
	// What the request names: the Jev alias, or the Claude model id.
	modelId: string
	// The recording file's name (recordingSlug).
	slug: string
}

function targetFor(taskId: string, model: string): Target {
	if (model === RACERS.jev) {
		const racer = RACERS.jev
		return {
			taskId,
			racer,
			modelId: JEV_MODEL_ALIAS,
			slug: recordingSlug({ racer, modelId: JEV_MODEL_ALIAS })
		}
	}
	const racer = RACERS.llm
	return { taskId, racer, modelId: model, slug: recordingSlug({ racer, modelId: model }) }
}

/**
 * The (task, model) pairs to record. A pair whose recording already has the
 * task's current hash is skipped: the same items are never re-run to get a
 * different result (spec 12.4).
 */
export function selectTargets(
	tasks: ReadonlyMap<string, Task>,
	args: CliArgs,
	existingHash: (taskId: string, slug: string) => string | null,
	hashOf: (task: Task) => string
): { run: Target[]; skipped: Target[] } {
	if (args.taskId !== null && !tasks.has(args.taskId)) {
		throw new Error(`Unknown task "${args.taskId}"`)
	}
	const chosenTasks = [...tasks.values()].filter(
		(task) => args.taskId === null || task.id === args.taskId
	)
	const models = RECORD_MODELS.filter((model) => args.model === null || model === args.model)
	const run: Target[] = []
	const skipped: Target[] = []
	for (const task of chosenTasks) {
		const hash = hashOf(task)
		// A Sandbox template is Jev only (spec 9).
		const taskModels =
			task.kind === TASK_KINDS.sandbox ? models.filter((model) => model === RACERS.jev) : models
		for (const model of taskModels) {
			const target = targetFor(task.id, model)
			if (existingHash(task.id, target.slug) === hash) skipped.push(target)
			else run.push(target)
		}
	}
	return { run, skipped }
}
