import { describe, expect, it } from 'vitest'
import { LOAD_TESTS, loadTestSchema } from './load-test'

const VALID = {
	ranAt: '2026-10-02T12:00:00.000Z',
	k6Version: '2.3.0',
	target: 'Local production build',
	peakUsers: 1000,
	durationSeconds: 240,
	requests: 50000,
	requestsPerSecond: 208.3,
	failedRate: 0,
	latencyMs: { median: 90, p95: 800, p99: 1200, max: 3000 },
	thresholdsPassed: true
}

describe('loadTestSchema', () => {
	it('publishes the committed k6 runs, the 1,000-user target first', () => {
		expect(LOAD_TESTS.map((run) => run.peakUsers)).toEqual([1000, 400])
		expect(LOAD_TESTS.every((run) => run.requests > 0)).toBe(true)
	})

	it('accepts a well-formed result', () => {
		expect(loadTestSchema.parse(VALID)).toEqual(VALID)
	})

	it('rejects a failure rate outside 0-1', () => {
		expect(() => loadTestSchema.parse({ ...VALID, failedRate: 2 })).toThrow()
	})

	it('rejects a missing latency figure', () => {
		const latencyMs: Partial<typeof VALID.latencyMs> = { ...VALID.latencyMs }
		delete latencyMs.p95
		expect(() => loadTestSchema.parse({ ...VALID, latencyMs })).toThrow()
	})
})
