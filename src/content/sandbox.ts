import 'server-only'
import templates from '../../content/sandbox/templates.json'
import type { ArenaSide } from '@/features/arena/snapshot'
import { RACERS, TASK_KINDS } from '@/lib/constants'
import { sideOf } from './arena'
import { currentRecordings } from './recordings'
import { sandboxTemplateSchema, type SandboxTemplate } from './sandbox-schema'
import { TASKS } from './tasks'
import type { Task } from './task-schema'

/** Parses the templates and checks that each names a real Sandbox task, keyed by id in listed order. */
export function buildTemplateMap(raw: unknown[]): ReadonlyMap<string, SandboxTemplate> {
	const map = new Map<string, SandboxTemplate>()
	for (const entry of raw) {
		const template = sandboxTemplateSchema.parse(entry)
		if (map.has(template.id)) throw new Error(`Duplicate template id: ${template.id}`)
		const task = TASKS.get(template.taskId)
		if (task?.kind !== TASK_KINDS.sandbox) {
			throw new Error(`Template ${template.id} needs a sandbox task, not ${template.taskId}`)
		}
		map.set(template.id, template)
	}
	return map
}

export const TEMPLATES = buildTemplateMap(templates)

/** What the Sandbox page needs for one template: its task (the setup) and Jev's recorded answer. */
export type SandboxTemplateView = {
	template: SandboxTemplate
	task: Task
	jev: ArenaSide | null
}

/** Every template with its recorded Jev result, built on the server. */
export function templateViews(): SandboxTemplateView[] {
	return [...TEMPLATES.values()].map((template) => {
		const task = TASKS.get(template.taskId)
		const item = task?.items[0]
		if (!task || !item) throw new Error(`Template ${template.id} lost its task`)
		const recording = currentRecordings(task.id).find((candidate) => candidate.racer === RACERS.jev)
		return { template, task, jev: recording ? sideOf(recording, item.id) : null }
	})
}
