import { recordingSchema, type Recording } from '@/content/recording-schema'
import { choiceTask } from '@/runner/testing/tasks'

// Small, valid Recordings of choiceTask (items t1 billing, t2 technical, t3
// unlabelled) for race and level tests. Not product content (ROADMAP Rule-5).

const HASH = 'a'.repeat(64)
const RECORDED_AT = '2026-10-02T10:00:00.000Z'

function jevParsed(choice: string) {
	return {
		answer: {
			type: 'choice',
			choice,
			probabilities: { billing: 0.1, technical: 0.1, sales: 0.1, [choice]: 0.8 },
			confidence: 0.8
		}
	}
}

function event(
	itemId: string,
	lane: number,
	startMs: number,
	endMs: number,
	result: { ok: boolean; raw: string; parsed: unknown; credit: number | null },
	usage: { inputTokens: number; outputTokens: number },
	costUsd: number
) {
	return {
		itemId,
		lane,
		startMs,
		endMs,
		...result,
		correct: result.credit === null ? null : result.credit === 1,
		latencyMs: endMs - startMs,
		usage,
		costUsd
	}
}

const JEV_USAGE = { inputTokens: 20, outputTokens: 1 }
const JEV_COST = 0.00000084

export const jevRecording: Recording = recordingSchema.parse({
	taskId: choiceTask.id,
	taskHash: HASH,
	racer: 'jev',
	modelId: 'jev-1.13.0',
	recordedAt: RECORDED_AT,
	price: { inputPerM: 0.042, outputPerM: 0, source: 'https://docs.typesafe.ai/pricing' },
	lanes: 4,
	events: [
		event(
			't1',
			0,
			0,
			100,
			{ ok: true, raw: '{}', parsed: jevParsed('billing'), credit: 1 },
			JEV_USAGE,
			JEV_COST
		),
		event(
			't2',
			1,
			0,
			120,
			{ ok: true, raw: '{}', parsed: jevParsed('technical'), credit: 1 },
			JEV_USAGE,
			JEV_COST
		),
		event(
			't3',
			2,
			0,
			90,
			{ ok: true, raw: '{}', parsed: jevParsed('sales'), credit: null },
			JEV_USAGE,
			JEV_COST
		)
	],
	totals: {
		items: 3,
		scored: 2,
		correct: 2,
		accuracy: 1,
		wallMs: 120,
		costUsd: 0.00000252,
		inputTokens: 60,
		outputTokens: 3,
		parseFailures: 0
	}
})

const LLM_USAGE = { inputTokens: 150, outputTokens: 10 }
const OPUS_COST = 0.0008

export const opusRecording: Recording = recordingSchema.parse({
	taskId: choiceTask.id,
	taskHash: HASH,
	racer: 'llm',
	modelId: 'claude-opus-5-5',
	recordedAt: RECORDED_AT,
	price: { inputPerM: 4, outputPerM: 20, source: 'https://platform.claude.com/docs/pricing' },
	lanes: 4,
	events: [
		event(
			't1',
			0,
			0,
			900,
			{ ok: true, raw: '{"answer":"billing"}', parsed: 'billing', credit: 1 },
			LLM_USAGE,
			OPUS_COST
		),
		event(
			't2',
			1,
			0,
			1100,
			{ ok: false, raw: 'Sure! It is technical.', parsed: null, credit: 0 },
			LLM_USAGE,
			OPUS_COST
		),
		event(
			't3',
			2,
			0,
			1000,
			{ ok: true, raw: '{"answer":"billing"}', parsed: 'billing', credit: null },
			LLM_USAGE,
			OPUS_COST
		)
	],
	totals: {
		items: 3,
		scored: 2,
		correct: 1,
		accuracy: 0.5,
		wallMs: 1100,
		costUsd: 0.0024,
		inputTokens: 450,
		outputTokens: 30,
		parseFailures: 1
	}
})

const SONNET_COST = 0.0004

export const sonnetRecording: Recording = recordingSchema.parse({
	...opusRecording,
	modelId: 'claude-sonnet-5-5',
	price: { inputPerM: 2, outputPerM: 10, source: 'https://platform.claude.com/docs/pricing' },
	events: opusRecording.events.map((recorded) => ({ ...recorded, costUsd: SONNET_COST })),
	totals: { ...opusRecording.totals, costUsd: 0.0012 }
})
