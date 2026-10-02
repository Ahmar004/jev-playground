import { describe, expect, it } from 'vitest'
import { buildLevelMap, getCheckQuestion } from './levels'
import { testLevel } from './testing/levels'

const TASK_IDS = new Set(['test-choice'])
const otherCheck = {
	questions: testLevel.check.questions.map((question) => ({
		...question,
		id: `${question.id}-other`
	}))
}

describe('buildLevelMap', () => {
	it('parses levels and keys them by id in path order', () => {
		const second = { ...testLevel, id: 'test-second', order: 2, check: otherCheck }
		const map = buildLevelMap([second, testLevel], TASK_IDS)
		expect([...map.keys()]).toEqual(['test-level', 'test-second'])
	})

	it('rejects a level whose task does not exist', () => {
		expect(() => buildLevelMap([{ ...testLevel, taskIds: ['missing'] }], TASK_IDS)).toThrow(
			/missing/
		)
	})

	it('rejects duplicate ids and duplicate orders', () => {
		expect(() => buildLevelMap([testLevel, testLevel], TASK_IDS)).toThrow(/Duplicate level id/)
		expect(() => buildLevelMap([testLevel, { ...testLevel, id: 'other' }], TASK_IDS)).toThrow(
			/order/
		)
	})
	it('rejects a check question id used by two levels', () => {
		const other = { ...testLevel, id: 'other', order: 2 }
		expect(() => buildLevelMap([testLevel, other], TASK_IDS)).toThrow(
			'Duplicate check question id: test-q1'
		)
	})
})

describe('getCheckQuestion', () => {
	it('finds a question and its level', () => {
		expect(getCheckQuestion('speed-race-tool-fit')?.level.id).toBe('speed-race')
	})

	it('returns undefined for an unknown id', () => {
		expect(getCheckQuestion('nope')).toBeUndefined()
	})
})
