import { describe, expect, it } from 'vitest'
import { buildLevelMap } from './levels'
import { testLevel } from './testing/levels'

const TASK_IDS = new Set(['test-choice'])

describe('buildLevelMap', () => {
	it('parses levels and keys them by id in path order', () => {
		const second = { ...testLevel, id: 'test-second', order: 2 }
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
})
