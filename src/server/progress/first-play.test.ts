import { describe, expect, it } from 'vitest'
import { LEVELS } from '@/content/levels'
import { currentRecordings } from '@/content/recordings'
import { TASKS } from '@/content/tasks'
import { trickPairs } from '@/features/levels/tricks/pairs'
import { BADGES, LEVEL_WIDGETS, RACERS } from '@/lib/constants'
import { firstPlayBadge, firstPlaySchema, type FirstPlayContext } from './first-play'

function context(levelId: string): FirstPlayContext {
	const level = LEVELS.get(levelId)
	if (!level) throw new Error(`missing level ${levelId}`)
	const taskId = level.tasks[0]?.id ?? ''
	return {
		level,
		task: TASKS.get(taskId),
		jev: currentRecordings(taskId).find((recording) => recording.racer === RACERS.jev)
	}
}

const router = context('the-router')
const tricks = context('trick-jev')
const cards = router.level.router ?? []
const rightSort = Object.fromEntries(cards.map((card) => [card.taskId, card.best]))
const pairs = tricks.task && tricks.jev ? trickPairs(tricks.task, tricks.jev, undefined) : []
const rightGuesses = Object.fromEntries(pairs.map((pair) => [pair.id, pair.fooled ?? false]))

function without<Value>(record: Record<string, Value>, key: string | undefined) {
	return Object.fromEntries(Object.entries(record).filter(([entryKey]) => entryKey !== key))
}

describe('firstPlayBadge: the Router (right_tool)', () => {
	it('earns right_tool when every card goes to its best tool', () => {
		const play = { kind: LEVEL_WIDGETS.router, assignments: rightSort }
		expect(firstPlayBadge(play, router)).toBe(BADGES.rightTool)
	})

	it('earns nothing when one card is wrong', () => {
		const [first] = cards
		if (!first) throw new Error('no cards')
		const wrong = first.best === 'jev' ? 'code' : 'jev'
		const play = {
			kind: LEVEL_WIDGETS.router,
			assignments: { ...rightSort, [first.taskId]: wrong }
		} as const
		expect(firstPlayBadge(play, router)).toBeNull()
	})

	it('rejects a sort that leaves a card out or adds an unknown one', () => {
		const partial = without(rightSort, cards[0]?.taskId)
		expect(firstPlayBadge({ kind: LEVEL_WIDGETS.router, assignments: partial }, router)).toBe(
			'invalid'
		)
		const extra = { ...partial, ghost: 'jev' as const }
		expect(firstPlayBadge({ kind: LEVEL_WIDGETS.router, assignments: extra }, router)).toBe(
			'invalid'
		)
	})

	it('rejects a play for a different level game', () => {
		expect(firstPlayBadge({ kind: LEVEL_WIDGETS.tricks, guesses: rightGuesses }, router)).toBe(
			'invalid'
		)
	})
})

describe('firstPlayBadge: Trick Jev (trickster)', () => {
	it('has six recorded pairs, at least one of which fooled Jev', () => {
		expect(pairs).toHaveLength(6)
		expect(pairs.some((pair) => pair.fooled === true)).toBe(true)
	})

	it('earns trickster when all six guesses match the recording', () => {
		expect(firstPlayBadge({ kind: LEVEL_WIDGETS.tricks, guesses: rightGuesses }, tricks)).toBe(
			BADGES.trickster
		)
	})

	it('earns nothing when "fooled" is picked for every pair', () => {
		const allFooled = Object.fromEntries(pairs.map((pair) => [pair.id, true]))
		expect(firstPlayBadge({ kind: LEVEL_WIDGETS.tricks, guesses: allFooled }, tricks)).toBeNull()
	})

	it('rejects guesses that skip a pair', () => {
		const partial = without(rightGuesses, pairs[0]?.id)
		expect(firstPlayBadge({ kind: LEVEL_WIDGETS.tricks, guesses: partial }, tricks)).toBe('invalid')
	})
})

describe('firstPlaySchema', () => {
	it('rejects a tool that is not Jev, an LLM or Code', () => {
		expect(() =>
			firstPlaySchema.parse({ kind: 'router', assignments: { 'router-sum': 'magic' } })
		).toThrow()
	})
})
