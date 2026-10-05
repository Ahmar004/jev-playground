import speedRace from '../../content/levels/speed-race.json'
import writeMeAPoem from '../../content/levels/write-me-a-poem.json'
import countAndDates from '../../content/levels/count-and-dates.json'
import howSure from '../../content/levels/how-sure.json'
import breakItDown from '../../content/levels/break-it-down.json'
import theRouter from '../../content/levels/the-router.json'
import spotThePhish from '../../content/levels/spot-the-phish.json'
import trickJev from '../../content/levels/trick-jev.json'
import { levelSchema, type CheckQuestion, type Level } from './level-schema'
import { TASKS } from './tasks'

// Every file in content/levels/ is imported here, so content renders at build
// time (DESIGN 4.1). registry.test.ts fails when a file is missing.
const RAW_LEVELS: unknown[] = [
	speedRace,
	writeMeAPoem,
	countAndDates,
	howSure,
	breakItDown,
	theRouter,
	spotThePhish,
	trickJev
]

/** Parses levels, checks ids, orders and task ids, and keys them by id in path order. */
export function buildLevelMap(
	raw: unknown[],
	taskIds: ReadonlySet<string>
): ReadonlyMap<string, Level> {
	const levels = raw.map((entry) => levelSchema.parse(entry)).sort((a, b) => a.order - b.order)
	const map = new Map<string, Level>()
	const orders = new Set<number>()
	const questionIds = new Set<string>()
	for (const level of levels) {
		if (map.has(level.id)) throw new Error(`Duplicate level id: ${level.id}`)
		if (orders.has(level.order)) throw new Error(`Duplicate level order: ${level.order}`)
		for (const { id: taskId } of level.tasks) {
			if (!taskIds.has(taskId)) throw new Error(`Level ${level.id} uses unknown task ${taskId}`)
		}
		for (const question of level.check.questions) {
			if (questionIds.has(question.id))
				throw new Error(`Duplicate check question id: ${question.id}`)
			questionIds.add(question.id)
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

/** The level after this one in path order, or undefined after the last level. */
export function nextLevel(levels: ReadonlyMap<string, Level>, id: string): Level | undefined {
	const ordered = [...levels.values()]
	const index = ordered.findIndex((level) => level.id === id)
	return index === -1 ? undefined : ordered[index + 1]
}

export function getCheckQuestion(
	questionId: string
): { level: Level; question: CheckQuestion } | undefined {
	for (const level of LEVELS.values()) {
		const question = level.check.questions.find((entry) => entry.id === questionId)
		if (question) return { level, question }
	}
	return undefined
}
