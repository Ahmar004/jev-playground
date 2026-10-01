import speedRace from '../../content/levels/speed-race.json'
import { levelSchema, type Level } from './level-schema'
import { TASKS } from './tasks'

// Every file in content/levels/ is imported here, so content renders at build
// time (DESIGN 4.1). registry.test.ts fails when a file is missing.
const RAW_LEVELS: unknown[] = [speedRace]

/** Parses levels, checks ids, orders and task ids, and keys them by id in path order. */
export function buildLevelMap(
	raw: unknown[],
	taskIds: ReadonlySet<string>
): ReadonlyMap<string, Level> {
	const levels = raw.map((entry) => levelSchema.parse(entry)).sort((a, b) => a.order - b.order)
	const map = new Map<string, Level>()
	const orders = new Set<number>()
	for (const level of levels) {
		if (map.has(level.id)) throw new Error(`Duplicate level id: ${level.id}`)
		if (orders.has(level.order)) throw new Error(`Duplicate level order: ${level.order}`)
		for (const taskId of level.taskIds) {
			if (!taskIds.has(taskId)) throw new Error(`Level ${level.id} uses unknown task ${taskId}`)
		}
		orders.add(level.order)
		map.set(level.id, level)
	}
	return map
}

export const LEVELS: ReadonlyMap<string, Level> = buildLevelMap(RAW_LEVELS, new Set(TASKS.keys()))

export function getLevel(id: string): Level | undefined {
	return LEVELS.get(id)
}
