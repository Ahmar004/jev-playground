// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { choiceTask, noulTask } from '@/runner/testing/tasks'
import { parseCliArgs, RECORD_MODELS, selectTargets } from './targets'

const tasks = new Map([
	[choiceTask.id, choiceTask],
	[noulTask.id, noulTask]
])
const hashOf = (task: { id: string }) => `hash-${task.id}`

describe('parseCliArgs', () => {
	it('defaults to every task and model, for real', () => {
		expect(parseCliArgs([])).toEqual({ taskId: null, model: null, dryRun: false })
	})

	it('reads --task, --model and --dry-run', () => {
		expect(parseCliArgs(['--task', 'x', '--model', 'claude-opus-5-5', '--dry-run'])).toEqual({
			taskId: 'x',
			model: 'claude-opus-5-5',
			dryRun: true
		})
	})

	it('rejects a model it does not record', () => {
		expect(() => parseCliArgs(['--model', 'gpt-9'])).toThrow(/gpt-9/)
	})

	it('rejects an unknown flag', () => {
		expect(() => parseCliArgs(['--force'])).toThrow()
	})
})

describe('selectTargets', () => {
	const none = () => null

	it('runs Jev then the three Claude models for every task', () => {
		const { run, skipped } = selectTargets(tasks, parseCliArgs([]), none, hashOf)
		expect(skipped).toEqual([])
		expect(run).toHaveLength(tasks.size * RECORD_MODELS.length)
		expect(run[0]).toEqual({
			taskId: choiceTask.id,
			racer: 'jev',
			modelId: 'jev-latest',
			slug: 'jev'
		})
		expect(run[1]).toEqual({
			taskId: choiceTask.id,
			racer: 'llm',
			modelId: 'claude-haiku-4-5-20251001',
			slug: 'claude-haiku-4-5-20251001'
		})
	})

	it('filters by --task and --model', () => {
		const args = parseCliArgs(['--task', noulTask.id, '--model', 'jev'])
		const { run } = selectTargets(tasks, args, none, hashOf)
		expect(run).toEqual([{ taskId: noulTask.id, racer: 'jev', modelId: 'jev-latest', slug: 'jev' }])
	})

	it('skips a pair whose recording has the current hash, and reruns a stale one', () => {
		const existing = (taskId: string, slug: string) =>
			slug === 'jev' ? (taskId === choiceTask.id ? `hash-${choiceTask.id}` : 'old-hash') : null
		const args = parseCliArgs(['--model', 'jev'])
		const { run, skipped } = selectTargets(tasks, args, existing, hashOf)
		expect(skipped.map((target) => target.taskId)).toEqual([choiceTask.id])
		expect(run.map((target) => target.taskId)).toEqual([noulTask.id])
	})

	it('throws on an unknown task', () => {
		expect(() => selectTargets(tasks, parseCliArgs(['--task', 'nope']), none, hashOf)).toThrow(
			/nope/
		)
	})
})
