// k6 load test (R75, R78): 1,000 simultaneous signed-in Beginner-mode users
// walk the main pages against the local production build (`pnpm start`).
// Run `node load/session.mjs` first; see docs/load-test.md.
import http from 'k6/http'
import { check, sleep } from 'k6'

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000'
const COOKIE = open('./.session').trim()
const PEAK_USERS = Number(__ENV.PEAK_USERS || 1000)
const RAMP = __ENV.RAMP || '1m'
const HOLD = __ENV.HOLD || '2m'

// Every page a Beginner reaches from Home. Home, Path, Leaderboard and
// Profile read the user's rows from Postgres on every request.
const PAGES = [
	'/',
	'/path',
	'/levels/speed-race',
	'/games',
	'/games/guardrail-gauntlet',
	'/arena',
	'/sandbox',
	'/quizzes/start',
	'/leaderboard',
	'/profile',
	'/methodology'
]

export const options = {
	scenarios: {
		users: {
			executor: 'ramping-vus',
			startVUs: 0,
			stages: [
				{ duration: RAMP, target: PEAK_USERS },
				{ duration: HOLD, target: PEAK_USERS },
				{ duration: '30s', target: 0 }
			],
			gracefulRampDown: '30s'
		}
	},
	thresholds: {
		// R75: no errors; R79: pages under 2 seconds.
		http_req_failed: ['rate<0.01'],
		http_req_duration: ['p(95)<2000'],
		checks: ['rate>0.99']
	},
	summaryTrendStats: ['avg', 'med', 'p(90)', 'p(95)', 'p(99)', 'max']
}

export default function userJourney() {
	for (const path of PAGES) {
		const response = http.get(`${BASE_URL}${path}`, {
			headers: { Cookie: COOKIE },
			redirects: 0,
			tags: { name: path }
		})
		// A redirect to /sign-in means the session was lost, which counts as a failure.
		check(response, { 'page served (200)': (r) => r.status === 200 })
		// A person reads each page before the next click.
		sleep(2 + Math.random() * 3)
	}
}

const round = (value) => Math.round(value)

// Writes the compact result the Methodology page renders (load/results-<peak users>.json).
export function handleSummary(data) {
	const metrics = data.metrics
	const duration = metrics.http_req_duration.values
	const result = {
		ranAt: new Date().toISOString(),
		k6Version: __ENV.K6_VERSION || 'unknown',
		target: 'Local production build (pnpm start) on one Windows PC',
		peakUsers: PEAK_USERS,
		durationSeconds: round(data.state.testRunDurationMs / 1000),
		requests: metrics.http_reqs.values.count,
		requestsPerSecond: Math.round(metrics.http_reqs.values.rate * 10) / 10,
		failedRate: metrics.http_req_failed.values.rate,
		latencyMs: {
			median: round(duration.med),
			p95: round(duration['p(95)']),
			p99: round(duration['p(99)']),
			max: round(duration.max)
		},
		thresholdsPassed: Object.values(metrics).every((metric) =>
			Object.values(metric.thresholds || {}).every((threshold) => threshold.ok)
		)
	}
	return {
		[`load/results-${PEAK_USERS}.json`]: `${JSON.stringify(result, null, '\t')}\n`,
		stdout: `${JSON.stringify(result, null, 2)}\n`
	}
}
