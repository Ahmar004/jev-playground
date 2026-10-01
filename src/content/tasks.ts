import { taskSchema, type Task } from './task-schema'

// Every file in content/tasks/ is imported here, so content renders at build
// time (DESIGN 4.1). registry.test.ts fails when a file is missing.
// Slice 3 adds the first task.
const RAW_TASKS: unknown[] = []

// Parsed at import, so a malformed file fails the build at prerender.
export const TASKS: ReadonlyMap<string, Task> = new Map(
	RAW_TASKS.map((raw) => {
		const task = taskSchema.parse(raw)
		return [task.id, task]
	})
)

export function getTask(id: string): Task {
	const task = TASKS.get(id)
	if (!task) throw new Error(`Unknown task: ${id}`)
	return task
}
