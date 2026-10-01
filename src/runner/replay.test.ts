import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { recordingSchema } from '@/content/recording-schema'
import { replaySchedule, replaySource } from './replay'
import type { RunEvent } from './types'

function event(itemId: string, lane: number, startMs: number, endMs: number) {
	return {
		itemId,
		lane,
		startMs,
		endMs,
		ok: true,
		raw: '{}',
		parsed: {},
		credit: 1,
		correct: true,
		latencyMs: endMs - startMs,
		usage: { inputTokens: 10, outputTokens: 1 },
		costUsd: 0.001
	}
}

const recording = recordingSchema.parse({
	taskId: 'test-choice',
	taskHash: 'b'.repeat(64),
	racer: 'llm',
	modelId: 'claude-opus-5-5',
	recordedAt: '2026-10-02T10:00:00.000Z',
	price: { inputPerM: 4, outputPerM: 20, source: 'https://platform.claude.com/x' },
	lanes: 4,
	events: [event('a', 0, 0, 900), event('b', 1, 5, 400), event('c', 1, 400, 1200)],
	totals: {
		items: 3,
		scored: 3,
		correct: 3,
		accuracy: 1,
		wallMs: 1200,
		costUsd: 0.003,
		inputTokens: 30,
		outputTokens: 3,
		parseFailures: 0
	}
})

const label = (e: RunEvent) =>
	e.type === 'item_started'
		? `start:${e.itemId}`
		: e.type === 'item_finished'
			? `end:${e.result.itemId}`
			: 'done'

beforeEach(() => vi.useFakeTimers())
afterEach(() => vi.useRealTimers())

describe('replaySchedule', () => {
	it('orders recorded events by time and ends with the recorded totals', () => {
		expect(replaySchedule(recording).map((entry) => label(entry.event))).toEqual([
			'start:a',
			'start:b',
			'end:b',
			'start:c',
			'end:a',
			'end:c',
			'done'
		])
	})
})

describe('replaySource', () => {
	it('fires each event at its recorded offset', () => {
		const seen: string[] = []
		replaySource(recording, { onEvent: (e) => seen.push(label(e)) })
		vi.advanceTimersByTime(399)
		expect(seen).toEqual(['start:a', 'start:b'])
		vi.advanceTimersByTime(1)
		expect(seen).toEqual(['start:a', 'start:b', 'end:b', 'start:c'])
		vi.advanceTimersByTime(800)
		expect(seen.at(-1)).toBe('done')
	})

	it('skip emits every remaining event at once, then resolves', async () => {
		const seen: string[] = []
		const handle = replaySource(recording, { onEvent: (e) => seen.push(label(e)) })
		vi.advanceTimersByTime(10)
		handle.skip()
		expect(seen).toEqual(['start:a', 'start:b', 'end:b', 'start:c', 'end:a', 'end:c', 'done'])
		await expect(handle.done).resolves.toBeUndefined()
		vi.advanceTimersByTime(5000)
		expect(seen).toHaveLength(7)
	})

	it('abort stops the replay without the final event', async () => {
		const seen: string[] = []
		const controller = new AbortController()
		const handle = replaySource(recording, {
			onEvent: (e) => seen.push(label(e)),
			signal: controller.signal
		})
		vi.advanceTimersByTime(10)
		controller.abort()
		vi.advanceTimersByTime(5000)
		await handle.done
		expect(seen).toEqual(['start:a', 'start:b'])
	})
})
