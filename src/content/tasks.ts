import speedRace from '../../content/tasks/speed-race.json'
import datesDirect from '../../content/tasks/dates-direct.json'
import datesFixed from '../../content/tasks/dates-fixed.json'
import fruitsDirect from '../../content/tasks/fruits-direct.json'
import fruitsFixed from '../../content/tasks/fruits-fixed.json'
import howSure from '../../content/tasks/how-sure.json'
import writeMeAPoem from '../../content/tasks/write-me-a-poem.json'
import reviewBroad from '../../content/tasks/review-broad.json'
import reviewParts from '../../content/tasks/review-parts.json'
import phishSignals from '../../content/tasks/phish-signals.json'
import trickJev from '../../content/tasks/trick-jev.json'
import routerTicket from '../../content/tasks/router-ticket.json'
import routerSum from '../../content/tasks/router-sum.json'
import routerPoem from '../../content/tasks/router-poem.json'
import routerPhish from '../../content/tasks/router-phish.json'
import routerDates from '../../content/tasks/router-dates.json'
import routerSummary from '../../content/tasks/router-summary.json'
import guardrailGauntlet from '../../content/tasks/guardrail-gauntlet.json'
import confidenceCatch from '../../content/tasks/confidence-catch.json'
import needleHunt from '../../content/tasks/needle-hunt.json'
import numberCrunch from '../../content/tasks/number-crunch.json'
import reviewScore from '../../content/tasks/review-score.json'
import productMatch from '../../content/tasks/product-match.json'
import citationCheck from '../../content/tasks/citation-check.json'
import intentRouting from '../../content/tasks/intent-routing.json'
import sandboxSupportTicket from '../../content/tasks/sandbox-support-ticket.json'
import sandboxSpamCheck from '../../content/tasks/sandbox-spam-check.json'
import sandboxReviewRating from '../../content/tasks/sandbox-review-rating.json'
import sandboxResumeFit from '../../content/tasks/sandbox-resume-fit.json'
import sandboxModeration from '../../content/tasks/sandbox-moderation.json'
import sandboxCountingTrap from '../../content/tasks/sandbox-counting-trap.json'
import { taskSchema, type Task } from './task-schema'

// Every file in content/tasks/ is imported here, so content renders at build
// time (DESIGN 4.1). registry.test.ts fails when a file is missing.
const RAW_TASKS: unknown[] = [
	speedRace,
	writeMeAPoem,
	fruitsDirect,
	fruitsFixed,
	datesDirect,
	datesFixed,
	howSure,
	reviewBroad,
	reviewParts,
	phishSignals,
	trickJev,
	routerTicket,
	routerSum,
	routerPoem,
	routerPhish,
	routerDates,
	routerSummary,
	guardrailGauntlet,
	needleHunt,
	numberCrunch,
	reviewScore,
	productMatch,
	citationCheck,
	intentRouting,
	confidenceCatch,
	sandboxSupportTicket,
	sandboxSpamCheck,
	sandboxReviewRating,
	sandboxResumeFit,
	sandboxModeration,
	sandboxCountingTrap
]

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
