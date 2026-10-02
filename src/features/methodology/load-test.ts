import { z } from 'zod'
import run400 from '../../../load/results-400.json'
import run1000 from '../../../load/results-1000.json'

// The compact summary `load/journey.js` writes after a k6 run (R78).
export const loadTestSchema = z.strictObject({
	ranAt: z.iso.datetime(),
	k6Version: z.string().min(1),
	target: z.string().min(1),
	peakUsers: z.number().int().positive(),
	durationSeconds: z.number().int().positive(),
	requests: z.number().int().nonnegative(),
	requestsPerSecond: z.number().nonnegative(),
	failedRate: z.number().min(0).max(1),
	latencyMs: z.strictObject({
		median: z.number().nonnegative(),
		p95: z.number().nonnegative(),
		p99: z.number().nonnegative(),
		max: z.number().nonnegative()
	}),
	thresholdsPassed: z.boolean()
})
export type LoadTest = z.infer<typeof loadTestSchema>

// The published runs, the target load first (docs/load-test.md). Parsed at
// import, so a malformed file fails the build at prerender.
export const LOAD_TESTS: LoadTest[] = [run1000, run400]
	.map((raw) => loadTestSchema.parse(raw))
	.sort((a, b) => b.peakUsers - a.peakUsers)
