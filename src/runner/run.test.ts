import { describe, expect, it } from 'vitest'
import { runItems } from './run'
import { taskSchema } from '@/content/task-schema'
import type { ItemResult, RunEvent } from './types'

const task = taskSchema.parse({
	id: 'test-lanes',
	kind: 'noul',
	version: 1,
	jev: { questions: { answer: { type: 'noul', instructions: 'Is it urgent?' } } },
	items: Array.from({ length: 6 }, (_, index) => ({
		id: `i${index}`,
		state: `msg ${index}`,
		label: true
	}))
})

function okResult(itemId: string): ItemResult {
	return {
		itemId,
		ok: true,
		raw: '',
		parsed: true,
		credit: 1,
		correct: true,
		latencyMs: 10,
		usage: { inputTokens: 1, outputTokens: 1 },
		costUsd: 0.001
	}
}

// Calls that resolve only when the test says so, so lane use can be observed.
// Like fetch, a pending call rejects when the signal aborts.
function deferredRunner() {
	const pending = new Map<string, () => void>()
	let inFlight = 0
	let maxInFlight = 0
	const runItem = (taskItem: { id: string }, signal: AbortSignal) =>
		new Promise<ItemResult>((resolve, reject) => {
			inFlight += 1
			maxInFlight = Math.max(maxInFlight, inFlight)
			signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')))
			pending.set(taskItem.id, () => {
				inFlight -= 1
				resolve(okResult(taskItem.id))
			})
		})
	return { runItem, pending, maxInFlight: () => maxInFlight }
}

const flush = () => new Promise((resolve) => setTimeout(resolve, 0))

describe('runItems', () => {
	it('runs items in order over at most 4 lanes and finishes with totals', async () => {
		const events: RunEvent[] = []
		const runner = deferredRunner()
		const done = runItems(task, 'jev', runner.runItem, { onEvent: (event) => events.push(event) })
		await flush()
		expect([...runner.pending.keys()]).toEqual(['i0', 'i1', 'i2', 'i3'])
		for (const id of ['i0', 'i1', 'i2', 'i3', 'i4', 'i5']) {
			runner.pending.get(id)?.()
			await flush()
		}
		const totals = await done
		expect(runner.maxInFlight()).toBe(4)
		expect(totals).toMatchObject({ items: 6, correct: 6, accuracy: 1 })
		expect(
			events
				.filter((event) => event.type === 'item_started')
				.map((event) => event.type === 'item_started' && event.itemId)
		).toEqual(['i0', 'i1', 'i2', 'i3', 'i4', 'i5'])
		expect(events.at(-1)?.type).toBe('run_finished')
	})

	it('stops on abort without a run_finished event', async () => {
		const events: RunEvent[] = []
		const controller = new AbortController()
		const runner = deferredRunner()
		const done = runItems(task, 'jev', runner.runItem, {
			signal: controller.signal,
			onEvent: (event) => events.push(event)
		})
		await flush()
		controller.abort()
		runner.pending.get('i0')?.()
		expect(await done).toBeNull()
		expect(events.some((event) => event.type === 'run_finished')).toBe(false)
	})

	it('measures times from the injected clock', async () => {
		let clock = 1000
		const events: RunEvent[] = []
		await runItems(
			task,
			'llm',
			async (taskItem) => {
				clock += 50
				return okResult(taskItem.id)
			},
			{ lanes: 1, now: () => clock, onEvent: (event) => events.push(event) }
		)
		const finished = events.at(-1)
		expect(finished?.type === 'run_finished' && finished.totals.wallMs).toBe(300)
	})
})
