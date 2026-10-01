import { describe, expect, it } from 'vitest'
import { choiceTask, noulTask } from '@/runner/testing/tasks'
import { buildTaskMap } from './tasks'

describe('buildTaskMap', () => {
	it('keys parsed tasks by id', () => {
		const map = buildTaskMap([choiceTask, noulTask])
		expect(map.get(choiceTask.id)).toEqual(choiceTask)
		expect(map.size).toBe(2)
	})

	it('throws on a duplicate task id', () => {
		expect(() => buildTaskMap([choiceTask, choiceTask])).toThrow(
			`Duplicate task id: ${choiceTask.id}`
		)
	})
})
