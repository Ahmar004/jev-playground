import type { ItemWords } from '@/content/game-schema'
import { linesOf, type Structured, type Task } from '@/content/task-schema'
import { valueText } from '@/features/race/answer-text'
import { TASK_KINDS, type Racer } from '@/lib/constants'
import type { ItemResult } from '@/runner/types'
import {
	confidenceOf,
	decisionOf,
	noulOf,
	optionLabel,
	pickedLines,
	scoreLevelNames,
	scoreOf,
	yesOf
} from './scenes/scene-data'
import { codeDays, fanOutKeys, tagChances, tagsOf } from './scenes/play-data'

// What a game's item list shows: each item's input, its right answer and every racer's answer,
// as plain text (R86). Read from the stored results only; nothing here scores (R92).

export type StatePart = { name: string | null; text: string }

const PERCENT = 100

/** "shopA" becomes "Shop A", "claim" becomes "Claim". */
function fieldName(key: string): string {
	const words = key.replace(/([a-z])([A-Z])/g, '$1 $2')
	return words.charAt(0).toUpperCase() + words.slice(1)
}

/**
 * An item's input as named parts: a message as is, a problem's wording, a document's numbered lines,
 * or each text field of an object (a claim and its source, two shop listings).
 */
export function stateParts(state: Structured): StatePart[] {
	if (typeof state === 'string') return [{ name: null, text: state }]
	const lines = linesOf(state)
	if (lines) return lines.map((line, index) => ({ name: String(index + 1), text: line }))
	if (Array.isArray(state)) return [{ name: null, text: valueText(state) }]
	if (typeof state.problem === 'string') return [{ name: null, text: state.problem }]
	const fields = Object.entries(state).filter(
		(entry): entry is [string, string] => typeof entry[1] === 'string'
	)
	if (fields.length === 0) return [{ name: null, text: valueText(state) }]
	return fields.map(([key, text]) => ({ name: fieldName(key), text }))
}

function linesText(lines: readonly number[]): string {
	if (lines.length === 0) return 'No lines'
	const sorted = [...lines].sort((first, second) => first - second)
	if (sorted.length === 1) return `Line ${sorted[0]}`
	return `Lines ${sorted.slice(0, -1).join(', ')} and ${sorted.at(-1)}`
}

function isTags(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/** A right answer or a racer's answer in the page's own words: an option name, a level name, yes or no, or lines. */
export function answerLabel(words: ItemWords, task: Task, value: unknown): string {
	if (typeof value === 'boolean') return value ? (words.yes ?? 'Yes') : (words.no ?? 'No')
	if (task.kind === TASK_KINDS.score && typeof value === 'number') {
		// Jev's Score is a probability-weighted value such as 2.2, so it is named by the nearest level.
		const name = scoreLevelNames(task)[Math.round(value)]
		if (name === undefined) return String(value)
		return Number.isInteger(value) ? name : `${name} (score ${value})`
	}
	if (task.kind === TASK_KINDS.findLines && Array.isArray(value))
		return linesText(value.filter((line): line is number => typeof line === 'number'))
	if (task.kind === TASK_KINDS.choice && typeof value === 'string') return optionLabel(value)
	if (task.kind === TASK_KINDS.fanOut && isTags(value)) {
		const yes = fanOutKeys(task).filter((key) => value[key] === true)
		return yes.length === 0 ? 'No tags' : yes.map(optionLabel).join(', ')
	}
	return valueText(value)
}

/** A racer's answer in the label's shape, through the same readers the scenes use; null when it did not parse (R44). */
export function answerValue(task: Task, racer: Racer, result: ItemResult): unknown {
	switch (task.kind) {
		case TASK_KINDS.noul:
			return yesOf(racer, result)
		case TASK_KINDS.score:
			return scoreOf(racer, result)
		case TASK_KINDS.findLines:
			return pickedLines(racer, result)
		case TASK_KINDS.fanOut:
			return tagsOf(racer, result)
		default:
			return decisionOf(racer, result)
	}
}

/**
 * Jev's own number beside its answer: its confidence in a Choice, its probability of yes, or every
 * fan-out tag's probability; for Jev + Code, the day count Code worked out. Null for anyone else.
 */
export function jevNote(task: Task, racer: Racer, result: ItemResult): string | null {
	const days = codeDays(racer, result)
	if (days !== null) return `Code counted ${days} days`
	const chances = task.kind === TASK_KINDS.fanOut ? tagChances(racer, result) : null
	if (chances) {
		const tags = fanOutKeys(task).flatMap((key) => {
			const chance = chances[key]
			return chance === undefined ? [] : [`${optionLabel(key)} ${Math.round(chance * PERCENT)}%`]
		})
		return `chance of yes: ${tags.join(', ')}`
	}
	const confidence = confidenceOf(racer, result)
	if (confidence !== null) return `${Math.round(confidence * PERCENT)}% sure`
	const noul = task.kind === TASK_KINDS.noul ? noulOf(racer, result) : null
	if (noul !== null) return `${Math.round(noul * PERCENT)}% likely yes`
	return null
}
