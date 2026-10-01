import { describe, expect, it } from 'vitest'
import type { Recording } from '@/content/recording-schema'
import { priceRows, recordingRows } from './methodology-data'

describe('priceRows', () => {
	it('lists every stored price, sorted by model id', () => {
		const rows = priceRows({
			checkedOn: '2026-10-01',
			models: {
				'jev-1.13.0': {
					inputPerM: 0.042,
					outputPerM: 0,
					source: 'https://docs.typesafe.ai/models'
				},
				'claude-opus-5-5': { inputPerM: 4, outputPerM: 20, source: 'https://example.com/p' }
			}
		})
		expect(rows.map((row) => row.modelId)).toEqual(['claude-opus-5-5', 'jev-1.13.0'])
		expect(rows[1]).toEqual({
			modelId: 'jev-1.13.0',
			inputPerM: 0.042,
			outputPerM: 0,
			source: 'https://docs.typesafe.ai/models'
		})
	})
})

describe('recordingRows', () => {
	const base = {
		taskHash: 'a'.repeat(64),
		price: null,
		lanes: 4,
		totals: {
			items: 2,
			scored: 2,
			correct: 2,
			accuracy: 1,
			wallMs: 1,
			costUsd: 0,
			inputTokens: 0,
			outputTokens: 0,
			parseFailures: 0
		},
		events: []
	}
	it('lists each recording with its date, Jev first within a task', () => {
		const recordings: Recording[] = [
			{
				...base,
				taskId: 'b',
				racer: 'llm',
				modelId: 'claude-opus-5-5',
				recordedAt: '2026-10-02T09:00:00.000Z'
			},
			{
				...base,
				taskId: 'a',
				racer: 'llm',
				modelId: 'claude-haiku-4-5-20251001',
				recordedAt: '2026-10-01T09:00:00.000Z'
			},
			{
				...base,
				taskId: 'a',
				racer: 'jev',
				modelId: 'jev-1.13.0',
				recordedAt: '2026-10-01T08:00:00.000Z'
			}
		]
		expect(recordingRows(recordings)).toEqual([
			{ taskId: 'a', racer: 'jev', modelId: 'jev-1.13.0', recordedOn: '2026-10-01', items: 2 },
			{
				taskId: 'a',
				racer: 'llm',
				modelId: 'claude-haiku-4-5-20251001',
				recordedOn: '2026-10-01',
				items: 2
			},
			{ taskId: 'b', racer: 'llm', modelId: 'claude-opus-5-5', recordedOn: '2026-10-02', items: 2 }
		])
	})
})
