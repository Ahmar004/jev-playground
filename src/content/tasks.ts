import speedRace from '../../content/tasks/speed-race.json'
import { taskSchema, type Task } from './task-schema'

// Every file in content/tasks/ is imported here, so content renders at build
// time (DESIGN 4.1). registry.test.ts fails when a file is missing.
const RAW_TASKS: unknown[] = [speedRace]

// Parsed at import, so a malformed file fails the build at prerender.
export function buildTaskMap(raw: unknown[]): ReadonlyMap<string, Task> {
	const map = new Map<string, Task>()
	for (const entry of raw) {
		const task = taskSchema.parse(entry)
		if (map.has(task.id)) throw new Error(`Duplicate task id: ${task.id}`)
		map.set(task.id, task)
	}
	return map
}

export const TASKS: ReadonlyMap<string, Task> = buildTaskMap(RAW_TASKS)

export function getTask(id: string): Task {
	const task = TASKS.get(id)
	if (!task) throw new Error(`Unknown task: ${id}`)
	return task
}
