// The recording CLI (DESIGN 4.2): `corepack pnpm record [--task <id>] [--model <id>] [--dry-run]`.
// Runs Jev and the Claude models through the shared runner and writes
// content/recordings/<taskId>/<slug>.json. Every real run costs money.
import { join, relative, sep } from 'node:path'
import { PRICES } from '@/content/prices'
import { taskHash } from '@/content/task-hash'
import { TASKS, getTask } from '@/content/tasks'
import { RACERS, RUN_EVENTS } from '@/lib/constants'
import { buildAnthropicBody, callAnthropic } from '@/runner/providers/anthropic'
import { callTypeSafe } from '@/runner/providers/typesafe'
import type { RunEvent } from '@/runner/types'
import { estimateTarget, LLM_OUTPUT_ALLOWANCE_TOKENS } from './record/estimate'
import {
	BUDGET_USD,
	RECORDINGS_DIR,
	readRecordedHash,
	recordedSpend,
	writeRecording
} from './record/files'
import { ownerKeys } from './record/keys'
import { recordTarget, type ProviderCalls } from './record/record-target'
import { parseCliArgs, selectTargets, type Target } from './record/targets'

const ROOT = process.cwd()
const USD_DIGITS = 4

function usd(value: number | null): string {
	return value === null ? 'price unknown' : `$${value.toFixed(USD_DIGITS)}`
}

function label(target: Target): string {
	return `${target.taskId} / ${target.slug}`
}

function printCall(target: Target, event: RunEvent): void {
	if (event.type !== RUN_EVENTS.itemFinished) return
	const { result } = event
	const outcome =
		result.error ?? (result.ok ? (result.correct === false ? 'wrong' : 'ok') : 'unparsed')
	console.log(
		`  ${label(target)}  ${result.itemId}  lane ${event.lane}  ${Math.round(result.latencyMs)} ms  ${outcome}  ${usd(result.costUsd)}`
	)
}

function dryRun(targets: Target[]): void {
	let total = 0
	let unknown = false
	for (const target of targets) {
		const estimate = estimateTarget(getTask(target.taskId), target, PRICES)
		if (estimate.costUsd === null) unknown = true
		else total += estimate.costUsd
		console.log(
			`${label(target)}: ${estimate.calls} calls, ~${estimate.inputTokens} input tokens, ~${estimate.outputTokens} output tokens, ~${usd(estimate.costUsd)}`
		)
	}
	console.log(
		`\nEstimated total: ~${usd(total)}${unknown ? ' plus models with unknown price' : ''}.`
	)
	console.log(
		`Estimate: input = characters / 4; output = ${LLM_OUTPUT_ALLOWANCE_TOKENS} tokens per LLM call (an allowance, not a measurement). Nothing was spent.`
	)
}

async function record(targets: Target[]): Promise<void> {
	const keys = ownerKeys(process.env, {
		jev: targets.some((target) => target.racer === RACERS.jev),
		llm: targets.some((target) => target.racer === RACERS.llm)
	})
	const calls: ProviderCalls = {
		jev: (body, signal) => {
			if (!keys.typesafe) throw new Error('No TypeSafe key for a Jev run')
			return callTypeSafe(body, keys.typesafe, signal)
		},
		llm: (modelId, prompt, signal) => {
			if (!keys.anthropic) throw new Error('No Anthropic key for an LLM run')
			return callAnthropic(buildAnthropicBody(modelId, prompt), keys.anthropic, signal)
		}
	}
	const controller = new AbortController()
	process.once('SIGINT', () => controller.abort())

	let runCost = 0
	const written: string[] = []
	try {
		for (const target of targets) {
			console.log(`\nRecording ${label(target)}`)
			const recording = await recordTarget(getTask(target.taskId), target, {
				calls,
				prices: PRICES,
				recordedAt: new Date(),
				signal: controller.signal,
				onEvent: (event) => printCall(target, event)
			})
			const path = await writeRecording(ROOT, recording)
			written.push(
				relative(join(ROOT, ...RECORDINGS_DIR), path)
					.split(sep)
					.join('/')
			)
			runCost += recording.totals.costUsd ?? 0
			const { totals } = recording
			console.log(
				`Wrote ${path}: ${recording.modelId}, ${totals.correct}/${totals.scored} correct, ${Math.round(totals.wallMs)} ms, ${usd(totals.costUsd)}`
			)
		}
	} finally {
		// Files already written are still real spend, so the summary prints even
		// when a later target fails; the error then reaches main's catch.
		const spend = recordedSpend(ROOT)
		console.log(`\nThis run: ${usd(runCost)}.`)
		console.log(
			`All recordings on disk: ${usd(spend.costUsd)} of the $${BUDGET_USD} budget${spend.unknownPriceFiles ? ` (${spend.unknownPriceFiles} with unknown price)` : ''}.`
		)
		if (written.length > 0) {
			console.log('\nAdd any new file to src/content/recordings.ts (registry.test.ts checks):')
			for (const file of written) console.log(`  content/recordings/${file}`)
		}
	}
}

async function main(): Promise<void> {
	const args = parseCliArgs(process.argv.slice(2))
	const { run, skipped } = selectTargets(
		TASKS,
		args,
		(taskId, slug) => readRecordedHash(ROOT, taskId, slug),
		taskHash
	)
	for (const target of skipped) console.log(`Skip ${label(target)}: recording is current`)
	if (run.length === 0) {
		console.log('Nothing to record.')
		return
	}
	if (args.dryRun) dryRun(run)
	else await record(run)
}

main().catch((error: unknown) => {
	console.error(error instanceof Error ? error.message : error)
	process.exitCode = 1
})
