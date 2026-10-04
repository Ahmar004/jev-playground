import { describe, expect, it } from 'vitest'
import type { Recording } from '@/content/recording-schema'
import { priceGroups, recordingRows } from './methodology-data'

describe('priceGroups', () => {
	it('groups prices by provider, Jev first, each group sorted by model id', () => {
		const groups = priceGroups({
			checkedOn: '2026-10-04',
			models: {
				'gpt-5': {
					provider: 'openai',
					inputPerM: 1.25,
					outputPerM: 10,
					source: 'https://developers.openai.com/api/docs/pricing'
				},
				'claude-opus-5-5': {
					provider: 'anthropic',
					inputPerM: 4,
					outputPerM: 20,
					source: 'https://example.com/p'
				},
				'gemini-3.8-flash': {
					provider: 'google',
					inputPerM: 0.75,
					outputPerM: 3.75,
					source: 'https://ai.google.dev/gemini-api/docs/pricing',
					validUntil: '2026-12-31'
				},
				'jev-1.13.0': {
					provider: 'typesafe',
					inputPerM: 0.042,
					outputPerM: 0,
					source: 'https://docs.typesafe.ai/models'
				},
				'gpt-4o': {
					provider: 'openai',
					inputPerM: 2.5,
					outputPerM: 10,
					source: 'https://developers.openai.com/api/docs/pricing'
				}
			}
		})
		expect(groups.map((group) => group.provider)).toEqual([
			'typesafe',
			'anthropic',
			'openai',
			'google'
		])
		expect(groups[2]).toEqual({
			provider: 'openai',
			sources: ['https://developers.openai.com/api/docs/pricing'],
			rows: [
				{ modelId: 'gpt-4o', inputPerM: 2.5, outputPerM: 10 },
				{ modelId: 'gpt-5', inputPerM: 1.25, outputPerM: 10 }
			]
		})
		expect(groups[3]?.rows[0]).toEqual({
			modelId: 'gemini-3.8-flash',
			inputPerM: 0.75,
			outputPerM: 3.75,
			validUntil: '2026-12-31'
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
