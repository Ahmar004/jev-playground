import { describe, expect, it } from 'vitest'
import { recordingSchema, recordingSlug } from './recording-schema'

const RECORDING = {
	taskId: 'test-choice',
	taskHash: 'a'.repeat(64),
	racer: 'jev',
	modelId: 'jev-1.13.0',
	recordedAt: '2026-10-02T10:00:00.000Z',
	price: { inputPerM: 0.042, outputPerM: 0, source: 'https://docs.typesafe.ai/models' },
	lanes: 4,
	events: [
		{
			itemId: 't1',
			lane: 0,
			startMs: 0,
			endMs: 140,
			ok: true,
			raw: '{}',
			parsed: {},
			credit: 1,
			correct: true,
			latencyMs: 140,
			usage: { inputTokens: 300, outputTokens: 20 },
			costUsd: 0.0000126
		}
	],
	totals: {
		items: 1,
		scored: 1,
		correct: 1,
		accuracy: 1,
		wallMs: 140,
		costUsd: 0.0000126,
		inputTokens: 300,
		outputTokens: 20,
		parseFailures: 0
	}
}

describe('recordingSchema', () => {
	it('accepts a recording', () => {
		expect(recordingSchema.safeParse(RECORDING).success).toBe(true)
	})

	it('rejects a recording with a malformed hash or racer', () => {
		expect(recordingSchema.safeParse({ ...RECORDING, taskHash: 'abc' }).success).toBe(false)
		expect(recordingSchema.safeParse({ ...RECORDING, racer: 'code' }).success).toBe(false)
	})
})

describe('recordingSlug', () => {
	it("is 'jev' for Jev and the model id for an LLM", () => {
		expect(recordingSlug({ racer: 'jev', modelId: 'jev-1.13.0' })).toBe('jev')
		expect(recordingSlug({ racer: 'llm', modelId: 'claude-opus-5-5' })).toBe('claude-opus-5-5')
	})
})
