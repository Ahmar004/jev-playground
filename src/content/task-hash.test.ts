import { describe, expect, it } from 'vitest'
import { choiceTask } from '@/runner/testing/tasks'
import { canonicalJson, taskHash } from './task-hash'

describe('canonicalJson', () => {
	it('sorts object keys at every depth and keeps array order', () => {
		expect(canonicalJson({ b: 1, a: { d: [2, 1], c: null } })).toBe(
			'{"a":{"c":null,"d":[2,1]},"b":1}'
		)
	})
})

describe('taskHash', () => {
	it('is a stable sha256 that ignores key order', () => {
		const reordered = JSON.parse(
			JSON.stringify(Object.fromEntries(Object.entries(choiceTask).reverse()))
		)
		expect(taskHash(choiceTask)).toMatch(/^[0-9a-f]{64}$/)
		expect(taskHash(reordered)).toBe(taskHash(choiceTask))
	})

	it('changes when any content changes', () => {
		const edited = { ...choiceTask, items: [{ ...choiceTask.items[0], id: 't1', state: 'Edited' }] }
		expect(taskHash(edited)).not.toBe(taskHash(choiceTask))
	})
})
