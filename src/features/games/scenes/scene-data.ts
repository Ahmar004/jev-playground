import { z } from 'zod'
import type { Structured, Task } from '@/content/task-schema'
import { answerText, valueText } from '@/features/race/answer-text'
import type { RacerState } from '@/features/race/race-state'
import {
	ANSWER_KEY,
	GATE_DECISIONS,
	NOUL_THRESHOLD,
	QUESTION_KINDS,
	RACERS,
	type Racer
} from '@/lib/constants'
import { jevAnswerSchema } from '@/runner/parse'
import { lineNumberFromKey } from '@/runner/jev-request'
import type { ItemResult } from '@/runner/types'

const jevAnswersSchema = z.record(z.string(), jevAnswerSchema)
const combinedSchema = z.object({ answer: z.unknown() })

// What a game scene draws is only what the race's state holds: one stored result per finished call (R92).
// These helpers turn those results into the few facts a scene shows. They never score or time anything.

/** A racer's result for one item, whatever order the calls finished in. */
export function resultForItem(state: RacerState | undefined, itemId: string) {
	return state?.results.find((result) => result.itemId === itemId)
}

/** The call a racer finished most recently. */
export function latestResult(state: RacerState | undefined): ItemResult | undefined {
	return state?.results.at(-1)
}

/** The option a racer picked (Choice), as the task's option key; null when the output did not parse (R44). */
export function decisionOf(racer: Racer, result: ItemResult): string | null {
	return answerText(racer, result)
}

/** The level a racer gave (Score): Jev's score or the LLM's number; null when unparsed or not a number. */
export function scoreOf(racer: Racer, result: ItemResult): number | null {
	if (!result.ok) return null
	if (racer === RACERS.jev) {
		const answers = jevAnswersSchema.safeParse(result.parsed)
		const answer = answers.success ? answers.data[ANSWER_KEY] : undefined
		return answer?.type === QUESTION_KINDS.score ? answer.score : null
	}
	return typeof result.parsed === 'number' ? result.parsed : null
}

/** The 1-based lines a racer picked: Jev's yes answers (the same bar the scorer uses), or the LLM's line numbers. */
export function pickedLines(racer: Racer, result: ItemResult): number[] | null {
	if (!result.ok) return null
	if (racer === RACERS.jev) {
		const answers = result.parsed
		if (typeof answers !== 'object' || answers === null) return null
		return Object.entries(answers).flatMap(([key, value]) => {
			const line = lineNumberFromKey(key)
			const noul = jevAnswerSchema.safeParse(value)
			const yes =
				noul.success && noul.data.type === QUESTION_KINDS.noul && noul.data.noul >= NOUL_THRESHOLD
			return line !== null && yes ? [line] : []
		})
	}
	if (!Array.isArray(result.parsed)) return null
	return result.parsed.filter((line): line is number => typeof line === 'number')
}

export type GateTally = {
	// Messages that should be blocked, in the whole task.
	threats: number
	// Threats this racer blocked so far.
	stopped: number
	// Threats this racer let through (or could not answer) so far.
	leaked: number
	// Good messages this racer blocked so far.
	falseBlocks: number
	// Messages this racer has decided so far.
	decided: number
}

/** Guardrail Gauntlet's headline numbers, from the labels and the racer's decisions so far. */
export function gateTally(task: Task, state: RacerState | undefined, racer: Racer): GateTally {
	const threats = task.items.filter((item) => item.label === GATE_DECISIONS.block).length
	const tally: GateTally = { threats, stopped: 0, leaked: 0, falseBlocks: 0, decided: 0 }
	for (const result of state?.results ?? []) {
		const item = task.items.find((candidate) => candidate.id === result.itemId)
		if (!item) continue
		tally.decided += 1
		const blocked = decisionOf(racer, result) === GATE_DECISIONS.block
		if (item.label === GATE_DECISIONS.block) {
			if (blocked) tally.stopped += 1
			else tally.leaked += 1
		} else if (blocked) {
			tally.falseBlocks += 1
		}
	}
	return tally
}

/** A duel fighter's hit points: one per problem, lost on every miss (wrong, unparsed or failed). */
export function hitPoints(state: RacerState | undefined, total: number) {
	const misses = (state?.results ?? []).filter((result) => result.correct !== true).length
	return { left: Math.max(0, total - misses), total }
}

/** An item's text as a scene shows it: a message or review as is, a problem's wording, else its JSON (R86: plain text only). */
export function itemText(state: Structured): string {
	if (typeof state === 'string') return state
	if (!Array.isArray(state) && typeof state.problem === 'string') return state.problem
	return valueText(state)
}

/** The short name of each Score level, from the task's own criteria ("Very positive: ..." gives "Very positive"). */
export function scoreLevelNames(task: Task): string[] {
	const question = 'questions' in task.jev ? task.jev.questions[ANSWER_KEY] : undefined
	if (question?.type !== QUESTION_KINDS.score) return []
	return question.criteria.map((criterion) =>
		typeof criterion === 'string' ? (criterion.split(':')[0] ?? criterion) : valueText(criterion)
	)
}

const PERCENT = 100
const CENTER = 50
// The knot never leaves the rope, so it stops a little short of each end.
const KNOT_MARGIN = 4

/** Where the knot sits, as a percentage from Jev's end: the lead in correct scores, scaled to the whole task. */
export function knotPosition(jevCorrect: number, llmCorrect: number, itemsTotal: number): number {
	const lead = itemsTotal === 0 ? 0 : (jevCorrect - llmCorrect) / itemsTotal
	const position = CENTER - lead * CENTER
	return Math.max(KNOT_MARGIN, Math.min(PERCENT - KNOT_MARGIN, position))
}

/** The option keys of a Choice task, in the order the task lists them. */
export function choiceOptions(task: Task): string[] {
	const question = 'questions' in task.jev ? task.jev.questions[ANSWER_KEY] : undefined
	return question?.type === QUESTION_KINDS.choice ? Object.keys(question.criteria) : []
}

const ACRONYM_MAX_LENGTH = 2

/** An option key as words: door_lock becomes "Door lock", and a short key such as tv becomes "TV". */
export function optionLabel(key: string): string {
	const words = key.replaceAll('_', ' ')
	if (words.length <= ACRONYM_MAX_LENGTH) return words.toUpperCase()
	return words.charAt(0).toUpperCase() + words.slice(1)
}

function jevAnswer(result: ItemResult) {
	const answers = jevAnswersSchema.safeParse(result.parsed)
	return result.ok && answers.success ? answers.data[ANSWER_KEY] : undefined
}

/** Jev's probability of yes (Noul); null for the LLM or an answer that did not parse. */
export function noulOf(racer: Racer, result: ItemResult): number | null {
	if (racer !== RACERS.jev) return null
	const answer = jevAnswer(result)
	return answer?.type === QUESTION_KINDS.noul ? answer.noul : null
}

/** A yes or no (Noul): Jev's probability against the same bar the scorer uses, or the LLM's boolean; null when unparsed (R44). */
export function yesOf(racer: Racer, result: ItemResult): boolean | null {
	if (!result.ok) return null
	if (racer === RACERS.jev) {
		const noul = noulOf(racer, result)
		return noul === null ? null : noul >= NOUL_THRESHOLD
	}
	// Jev + Code keeps its combined answer under `answer` (a CombineOutput).
	const combined = racer === RACERS.jevCode ? combinedSchema.safeParse(result.parsed) : null
	const value = combined?.success ? combined.data.answer : result.parsed
	return typeof value === 'boolean' ? value : null
}

export type CheckTally = {
	// Bad items: a bad citation, a pair that is not the same, a clickbait headline.
	bad: number
	// Bad items this racer gave the bad answer to so far.
	caught: number
	// Bad items this racer let through, or could not answer, so far.
	missed: number
	// Good items this racer gave the bad answer to so far.
	falseAlarms: number
	decided: number
}

/**
 * The headline numbers of a yes or no game, from the labels and the racer's answers so far.
 * `badAnswer` is the label of a bad item: no for a bad citation, yes for a clickbait headline.
 */
export function checkTally(
	task: Task,
	state: RacerState | undefined,
	racer: Racer,
	badAnswer = false
): CheckTally {
	const bad = task.items.filter((item) => item.label === badAnswer).length
	const tally: CheckTally = { bad, caught: 0, missed: 0, falseAlarms: 0, decided: 0 }
	for (const result of state?.results ?? []) {
		const item = task.items.find((candidate) => candidate.id === result.itemId)
		if (!item) continue
		tally.decided += 1
		const said = yesOf(racer, result)
		if (item.label === badAnswer) {
			if (said === badAnswer) tally.caught += 1
			else tally.missed += 1
		} else if (said === badAnswer) {
			tally.falseAlarms += 1
		}
	}
	return tally
}

/** Jev's confidence in the option it picked (Choice); null for the LLM, which gives none. */
export function confidenceOf(racer: Racer, result: ItemResult): number | null {
	if (racer !== RACERS.jev) return null
	const answer = jevAnswer(result)
	return answer?.type === QUESTION_KINDS.choice ? answer.confidence : null
}

/** The machine acts on an answer at or above the threshold (the rule of runner/threshold.ts); an answer with no confidence is always acted on. */
export function actedOn(confidence: number | null, threshold: number): boolean {
	return confidence === null || confidence >= threshold
}
