import type { Label, Task, TaskItem } from '@/content/task-schema'
import {
	ANSWER_KEY,
	NOUL_THRESHOLD,
	QUESTION_KINDS,
	RACERS,
	TASK_KINDS,
	type Racer
} from '@/lib/constants'
import { lineNumberFromKey } from './jev-request'
import type { JevAnswer, JevAnswers } from './parse'
import type { LlmAnswer } from './types'

// Correctness rules from DESIGN 3.2.
export const SCORE_TOLERANCE = 0.5
export const FIND_LINES_F1_BAR = 0.8

const FULL = 1
const NONE = 0

function credit(right: boolean): number {
	return right ? FULL : NONE
}

function isYes(answer: JevAnswer | undefined): boolean | null {
	return answer?.type === QUESTION_KINDS.noul ? answer.noul >= NOUL_THRESHOLD : null
}

function isRecordLabel(label: Label): label is Record<string, boolean> {
	return typeof label === 'object' && !Array.isArray(label)
}

/** F1 of two sets of line numbers; two empty sets agree fully. */
export function f1(predicted: number[], expected: number[]): number {
	const want = new Set(expected)
	const got = new Set(predicted)
	if (want.size === 0 && got.size === 0) return FULL
	const hits = [...got].filter((line) => want.has(line)).length
	// 2PR / (P + R), written in counts so 0.8 comes out exactly 0.8.
	return (2 * hits) / (got.size + want.size)
}

function shareRight(label: Record<string, boolean>, right: (key: string) => boolean): number {
	const keys = Object.keys(label)
	return keys.length === 0 ? NONE : keys.filter(right).length / keys.length
}

/** Whether this racer's result on this item gets a credit at all (DESIGN 3.2). */
export function isScorable(task: Task, item: TaskItem, racer: Racer): boolean {
	if (task.kind === TASK_KINDS.generate) return racer === RACERS.llm
	if (item.label === undefined) return false
	// On a combine task Jev answers smaller questions; only Jev + Code is scored.
	return !(racer === RACERS.jev && task.combine)
}

export function missCredit(task: Task, item: TaskItem, racer: Racer): number | null {
	return isScorable(task, item, racer) ? NONE : null
}

export function toCorrect(value: number | null): boolean | null {
	return value === null ? null : value === FULL
}

export function scoreJev(task: Task, item: TaskItem, answers: JevAnswers): number | null {
	const { label } = item
	if (!isScorable(task, item, RACERS.jev) || label === undefined) return null
	const answer = answers[ANSWER_KEY]
	switch (task.kind) {
		case TASK_KINDS.choice:
			return credit(answer?.type === QUESTION_KINDS.choice && answer.choice === label)
		case TASK_KINDS.noul:
			return credit(isYes(answer) === label)
		case TASK_KINDS.score:
			return credit(
				answer?.type === QUESTION_KINDS.score &&
					typeof label === 'number' &&
					Math.abs(answer.score - label) <= SCORE_TOLERANCE
			)
		case TASK_KINDS.fanOut:
			return isRecordLabel(label)
				? shareRight(label, (key) => isYes(answers[key]) === label[key])
				: NONE
		case TASK_KINDS.findLines: {
			if (!Array.isArray(label)) return NONE
			const yesLines = Object.entries(answers).flatMap(([key, value]) => {
				const line = lineNumberFromKey(key)
				return line !== null && isYes(value) === true ? [line] : []
			})
			return credit(f1(yesLines, label) >= FIND_LINES_F1_BAR)
		}
		case TASK_KINDS.generate:
			return null
	}
}

/** Scores an answer in the LLM format: the LLM, the Code racer and Jev + Code. */
export function scoreAnswer(
	task: Task,
	item: TaskItem,
	racer: Racer,
	answer: LlmAnswer
): number | null {
	if (!isScorable(task, item, racer)) return null
	// generate: the LLM is right when its output parsed as non-empty text.
	if (task.kind === TASK_KINDS.generate) return FULL
	const { label } = item
	if (label === undefined) return null
	switch (task.kind) {
		case TASK_KINDS.fanOut: {
			if (!isRecordLabel(label) || typeof answer !== 'object' || Array.isArray(answer)) return NONE
			return shareRight(label, (key) => answer[key] === label[key])
		}
		case TASK_KINDS.findLines:
			return credit(
				Array.isArray(answer) && Array.isArray(label) && f1(answer, label) >= FIND_LINES_F1_BAR
			)
		default:
			return credit(answer === label)
	}
}
