import { describe, expect, it } from 'vitest'
import { LEVELS } from '@/content/levels'
import { currentRecordings } from '@/content/recordings'
import { getTask } from '@/content/tasks'
import { RACERS } from '@/lib/constants'
import type { ItemResult } from '@/runner/types'
import { codeRacer } from '@/runner/racers'
import { levelStages } from './lineup'
import { rightToolCount, toolOutcomes, CODE_HAS_NO_RULE } from './router/outcomes'
import { signalRows } from './signals/signal-rows'
import { guessesRight, trickPairs } from './tricks/pairs'
import { compositeRows, defaultWeights, weightsAreEmpty } from './weights/composite'

function recordingsOf(taskId: string) {
	return currentRecordings(taskId)
}
const jevOf = (taskId: string) => {
	const jev = recordingsOf(taskId).find((recording) => recording.racer === RACERS.jev)
	if (!jev) throw new Error(`No Jev recording for ${taskId}`)
	return jev
}
const opusOf = (taskId: string) =>
	recordingsOf(taskId).find((recording) => recording.modelId === 'claude-opus-5-5')

describe('level 5 composite', () => {
	const task = getTask('review-parts')
	it('builds one row per review from the runner, and equal weights are the default', () => {
		const weights = defaultWeights(task)
		expect(Object.keys(weights)).toHaveLength(5)
		const rows = compositeRows(task, jevOf(task.id), weights)
		expect(rows).toHaveLength(task.items.length)
		expect(
			rows.every((row) => row.composite !== null && row.composite >= 0 && row.composite <= 1)
		).toBe(true)
	})
	it('changes the score when a weight changes, without a new call', () => {
		const base = defaultWeights(task)
		const first = compositeRows(task, jevOf(task.id), base)
		const second = compositeRows(task, jevOf(task.id), { ...base, civil: 0 })
		expect(second.map((row) => row.composite)).not.toEqual(first.map((row) => row.composite))
	})
	it('has nothing to combine when every weight is zero, and the rows are misses', () => {
		const zero = Object.fromEntries(Object.keys(defaultWeights(task)).map((key) => [key, 0]))
		expect(weightsAreEmpty(zero)).toBe(true)
		expect(compositeRows(task, jevOf(task.id), zero).every((row) => row.composite === null)).toBe(
			true
		)
	})
})

describe('level 6 router', () => {
	const level = LEVELS.get('the-router')
	it('has a card for every task, with a recording for each', () => {
		expect(level?.router).toHaveLength(level?.tasks.length ?? -1)
	})
	it('shows what each tool did, and says when Code has no rule', async () => {
		if (!level?.router) throw new Error('no router')
		const tasks = level.tasks.map((entry) => getTask(entry.id))
		const stages = levelStages(
			level,
			tasks,
			tasks.flatMap((task) => recordingsOf(task.id))
		)
		const code: Record<string, ItemResult> = {}
		for (const task of tasks) {
			const item = task.items[0]
			if (task.code && item)
				code[task.id] = await codeRacer(task)(item, new AbortController().signal)
		}
		for (const stage of stages) {
			const [jev, llm, codeOutcome] = toolOutcomes(stage, 'claude-opus-5-5', code)
			expect(jev?.result).not.toBeNull()
			expect(llm?.result).not.toBeNull()
			if (stage.task.code) expect(codeOutcome?.result?.correct).toBe(true)
			else expect(codeOutcome?.missing).toBe(CODE_HAS_NO_RULE)
		}
	})
	it('counts the cards sent to the best tool', () => {
		if (!level?.router) throw new Error('no router')
		const perfect = Object.fromEntries(level.router.map((card) => [card.taskId, card.best]))
		expect(rightToolCount(level.router, perfect)).toBe(level.router.length)
		expect(rightToolCount(level.router, {})).toBe(0)
	})
})

describe('level 7 signals', () => {
	const task = getTask('phish-signals')
	it('gives every sign a probability, the true answer and the LLM answer', () => {
		for (const item of task.items) {
			const rows = signalRows(task, item.id, jevOf(task.id), opusOf(task.id))
			expect(rows).toHaveLength(10)
			for (const row of rows) {
				expect(row.probability).not.toBeNull()
				expect(row.truth).not.toBeNull()
				expect(row.llmYes).not.toBeNull()
				expect(row.lit).toBe((row.probability ?? 0) >= 0.5)
			}
		}
	})
})

describe('level 8 tricks', () => {
	const task = getTask('trick-jev')
	it('groups the items into six plain and tricky pairs', () => {
		const pairs = trickPairs(task, jevOf(task.id), opusOf(task.id))
		expect(pairs).toHaveLength(6)
		expect(pairs.every((pair) => pair.plain.jevProbability !== null)).toBe(true)
	})
	it('marks a pair fooled when Jev got the tricky wording wrong, and scores guesses against that', () => {
		const pairs = trickPairs(task, jevOf(task.id), opusOf(task.id))
		const fooled = pairs.filter((pair) => pair.fooled)
		expect(fooled.length).toBeGreaterThan(0)
		const guesses = Object.fromEntries(pairs.map((pair) => [pair.id, pair.fooled === true]))
		expect(guessesRight(pairs, guesses)).toBe(pairs.length)
		expect(guessesRight(pairs, {})).toBe(0)
	})
})
