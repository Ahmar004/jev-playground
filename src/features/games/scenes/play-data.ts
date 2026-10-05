import { z } from 'zod'
import type { Label, Task, TaskItem } from '@/content/task-schema'
import type { RacerState } from '@/features/race/race-state'
import { NOUL_THRESHOLD, QUESTION_KINDS, RACERS, type Racer } from '@/lib/constants'
import { jevAnswerSchema } from '@/runner/parse'
import type { ItemResult } from '@/runner/types'
import { scoreOf } from './scene-data'

// More readers for the scenes of Step-43's games. Like scene-data.ts, they only read the race's
// stored results (R92): nothing here times, prices or scores a call.

const jevAnswersSchema = z.record(z.string(), jevAnswerSchema)
const llmTagsSchema = z.record(z.string(), z.unknown())
const combinedDaysSchema = z.object({ detail: z.object({ days: z.number() }) })

/** One finished call: the item, its place in the task, and the racer's stored result. */
export type Play = { index: number; item: TaskItem; result: ItemResult }

/** A racer's finished calls in the order they finished, each with its item. */
export function plays(task: Task, state: RacerState | undefined): Play[] {
	return (state?.results ?? []).flatMap((result): Play[] => {
		const index = task.items.findIndex((item) => item.id === result.itemId)
		const item = task.items[index]
		return item ? [{ index, item, result }] : []
	})
}

export function playFor(list: readonly Play[], index: number): Play | undefined {
	return list.find((play) => play.index === index)
}

/** How many items, from the first, a racer has answered without a gap: where a walker has got to. */
export function answeredPrefix(task: Task, state: RacerState | undefined): number {
	const done = new Set(state?.results.map((result) => result.itemId))
	const gap = task.items.findIndex((item) => !done.has(item.id))
	return gap === -1 ? task.items.length : gap
}

/** A fan-out task's questions, in the order the task lists them. */
export function fanOutKeys(task: Task): string[] {
	return 'questions' in task.jev ? Object.keys(task.jev.questions) : []
}

/** Jev's probability of yes for every fan-out question; null for the LLM or an answer that did not parse. */
export function tagChances(racer: Racer, result: ItemResult): Record<string, number> | null {
	if (racer !== RACERS.jev || !result.ok) return null
	const answers = jevAnswersSchema.safeParse(result.parsed)
	if (!answers.success) return null
	return Object.fromEntries(
		Object.entries(answers.data).flatMap(([key, answer]): [string, number][] =>
			answer.type === QUESTION_KINDS.noul ? [[key, answer.noul]] : []
		)
	)
}

/** Every fan-out yes or no: Jev's against the scorer's bar, the LLM's booleans; null when unparsed (R44). */
export function tagsOf(racer: Racer, result: ItemResult): Record<string, boolean> | null {
	if (!result.ok) return null
	if (racer === RACERS.jev) {
		const chances = tagChances(racer, result)
		if (!chances) return null
		return Object.fromEntries(
			Object.entries(chances).map(([key, chance]) => [key, chance >= NOUL_THRESHOLD])
		)
	}
	const parsed = llmTagsSchema.safeParse(result.parsed)
	if (!parsed.success) return null
	return Object.fromEntries(
		Object.entries(parsed.data).filter((entry): entry is [string, boolean] => {
			return typeof entry[1] === 'boolean'
		})
	)
}

export const TAG_CALLS = {
	swish: 'swish',
	rimOut: 'rim_out',
	missed: 'missed',
	pass: 'pass'
} as const
export type TagCall = (typeof TAG_CALLS)[keyof typeof TAG_CALLS]

function isTagLabel(label: Label | undefined): label is Record<string, boolean> {
	return typeof label === 'object' && !Array.isArray(label)
}

/**
 * What happened at each hoop: a right yes (swish), a wrong yes (rim-out), a yes the racer
 * never threw (missed), or a right no (pass). A question the racer did not answer counts as no.
 */
export function tagCalls(item: TaskItem, tags: Record<string, boolean>): Record<string, TagCall> {
	if (!isTagLabel(item.label)) return {}
	return Object.fromEntries(
		Object.entries(item.label).map(([key, want]): [string, TagCall] => {
			const threw = tags[key] === true
			if (threw) return [key, want ? TAG_CALLS.swish : TAG_CALLS.rimOut]
			return [key, want ? TAG_CALLS.missed : TAG_CALLS.pass]
		})
	)
}

/** The day count Code worked out for Jev + Code (Date Defense); null for any other result. */
export function codeDays(racer: Racer, result: ItemResult): number | null {
	if (racer !== RACERS.jevCode || !result.ok) return null
	const output = combinedDaysSchema.safeParse(result.parsed)
	return output.success ? output.data.detail.days : null
}

/** How far a rating sits above (+) or below (-) the right level; null when unparsed or unlabelled. */
export function scoreOffset(racer: Racer, result: ItemResult, label: Label | undefined) {
	const score = scoreOf(racer, result)
	if (score === null || typeof label !== 'number') return null
	return score - label
}

export type Cell = { x: number; y: number }
export type Junction = { at: Cell; exits: Record<string, Cell> }

const UP: Cell = { x: 0, y: -1 }
// Turning left rotates the heading a quarter turn counter-clockwise on screen (y grows downwards).
// `0 - n` rather than `-n`, so a zero stays 0 and never becomes -0.
const turnLeft = ({ x, y }: Cell): Cell => ({ x: y, y: 0 - x })
const turnRight = ({ x, y }: Cell): Cell => ({ x: 0 - y, y: x })
const TURNS: Record<string, (heading: Cell) => Cell> = {
	left: turnLeft,
	straight: (heading) => heading,
	right: turnRight
}

/**
 * The maze a robot walks when it takes every right turn: one cell per junction, starting at
 * the origin facing up. Each junction lists the heading of its three exits, so a scene can draw
 * the dead ends a wrong turn runs into. An unknown direction counts as straight on.
 */
export function mazePath(directions: readonly string[]): { cells: Cell[]; junctions: Junction[] } {
	const cells: Cell[] = [{ x: 0, y: 0 }]
	const junctions: Junction[] = []
	let heading = UP
	let at: Cell = { x: 0, y: 0 }
	for (const direction of directions) {
		const exits = Object.fromEntries(
			Object.entries(TURNS).map(([name, turn]) => [name, turn(heading)])
		)
		junctions.push({ at, exits })
		heading = (TURNS[direction] ?? TURNS.straight!)(heading)
		at = { x: at.x + heading.x, y: at.y + heading.y }
		cells.push(at)
	}
	return { cells, junctions }
}
