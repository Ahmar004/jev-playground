import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { LoadTestSection } from './load-test-section'
import type { LoadTest } from './load-test'

const RUN: LoadTest = {
	ranAt: '2026-10-05T06:00:00.000Z',
	k6Version: '2.3.0',
	target: 'Local production build',
	peakUsers: 400,
	durationSeconds: 240,
	requests: 19000,
	requestsPerSecond: 81.7,
	failedRate: 0,
	latencyMs: { median: 214, p95: 583, p99: 765, max: 996 },
	thresholdsPassed: true
}
const OVERLOADED: LoadTest = {
	...RUN,
	peakUsers: 1000,
	requestsPerSecond: 86.3,
	latencyMs: { median: 6747, p95: 10062, p99: 12145, max: 13189 },
	thresholdsPassed: false
}

describe('LoadTestSection capacity line', () => {
	it('says what one Node process served, and the largest crowd that met the target', () => {
		render(<LoadTestSection runs={[OVERLOADED, RUN]} />)
		expect(
			screen.getByText(/One Node process served up to about 86 pages a second/)
		).toHaveTextContent(/comfortably up to 400 people at once/)
	})

	it('says so plainly when no run met the target, and never invents a number', () => {
		render(<LoadTestSection runs={[OVERLOADED]} />)
		const line = screen.getByText(/One Node process served up to about 86 pages a second/)
		expect(line).toHaveTextContent(/No run met the target/)
		expect(line).not.toHaveTextContent(/comfortably/)
	})
})
