import { createHash } from 'node:crypto'
import type { Task } from './task-schema'

// Runs on the server and in the CLI only (node:crypto). The UI shows a
// recording only when its taskHash matches the current task, so edited
// content never shows stale results (DESIGN 4.1).

/** JSON with object keys sorted at every depth, so key order never changes a hash. */
export function canonicalJson(value: unknown): string {
	if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`
	if (value !== null && typeof value === 'object') {
		const entries = Object.entries(value)
			.filter(([, entry]) => entry !== undefined)
			.sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
			.map(([key, entry]) => `${JSON.stringify(key)}:${canonicalJson(entry)}`)
		return `{${entries.join(',')}}`
	}
	return JSON.stringify(value)
}

export function taskHash(task: Task): string {
	return createHash('sha256').update(canonicalJson(task)).digest('hex')
}
