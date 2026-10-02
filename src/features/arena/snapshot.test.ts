import { describe, expect, it } from 'vitest'
import { taskSchema } from '@/content/task-schema'
import { arenaSnapshotSchema, questionText, stateText } from './snapshot'

const side = (racer: 'jev' | 'llm', raw = '{}') => ({
	racer,
	modelId: racer === 'jev' ? 'jev-1.13.0' : 'claude-opus-5-5',
	at: '2026-10-02T06:00:00.000Z',
	result: {
		itemId: 'i1',
		ok: true,
		raw,
		parsed: { answer: true },
		credit: 1,
		correct: true,
		latencyMs: 120,
		usage: { inputTokens: 10, outputTokens: 2 },
		costUsd: 0.0001
	}
})
const snapshot = {
	mode: 'beginner',
	title: 'Preset',
	question: 'Q?',
	state: 'text',
	sides: [side('jev'), side('llm')]
}

describe('arenaSnapshotSchema', () => {
	it('accepts a snapshot and refuses unknown fields', () => {
		expect(arenaSnapshotSchema.safeParse(snapshot).success).toBe(true)
		expect(arenaSnapshotSchema.safeParse({ ...snapshot, html: '<b>x</b>' }).success).toBe(false)
	})

	it('caps a raw output and the whole snapshot', () => {
		expect(
			arenaSnapshotSchema.safeParse({ ...snapshot, sides: [side('jev', 'x'.repeat(8001))] }).success
		).toBe(false)
		// `parsed` has no cap of its own, so the whole-snapshot cap is what stops it.
		const huge = side('jev')
		const big = {
			...snapshot,
			sides: [{ ...huge, result: { ...huge.result, parsed: 'p'.repeat(33_000) } }]
		}
		const result = arenaSnapshotSchema.safeParse(big)
		expect(result.success).toBe(false)
	})
})

describe('text helpers', () => {
	it('stateText keeps a string and indents an object', () => {
		expect(stateText('hi')).toBe('hi')
		expect(stateText({ a: 1 })).toBe('{\n  "a": 1\n}')
	})

	it('questionText gives a single question, or lists a fan_out', () => {
		const single = taskSchema.parse({
			id: 't',
			kind: 'noul',
			version: 1,
			jev: { questions: { answer: { type: 'noul', instructions: 'Is it?' } } },
			items: [{ id: 'i', state: 's' }]
		})
		expect(questionText(single)).toBe('Is it?')
		const fan = taskSchema.parse({
			id: 'f',
			kind: 'fan_out',
			version: 1,
			jev: {
				questions: {
					a: { type: 'noul', instructions: 'One?' },
					b: { type: 'noul', instructions: 'Two?' }
				}
			},
			items: [{ id: 'i', state: 's' }]
		})
		expect(questionText(fan)).toBe('One?\nTwo?')
	})
})
