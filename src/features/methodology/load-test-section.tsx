import type { LoadTest } from './load-test'

const SECTION = 'bg-surface border-border flex flex-col gap-2 rounded-lg border p-4 shadow-card'
const BODY = 'text-text-muted'
const HEAD_CELL = 'text-text border-border border-b py-2 pr-4 font-bold'
const CELL = 'border-border text-text-muted border-b py-2 pr-4'
// R79: a page should load in under 2 seconds.
const PAGE_BUDGET_MS = 2000
const MS_PER_SECOND = 1000
const PERCENT = 100

function seconds(ms: number): string {
	return ms < MS_PER_SECOND ? `${ms} ms` : `${(ms / MS_PER_SECOND).toFixed(1)} s`
}

function percent(rate: number): string {
	return `${(rate * PERCENT).toFixed(rate === 0 ? 0 : 2)}%`
}

/** The published k6 runs (R78), with what they mean in plain words. */
export function LoadTestSection({ runs }: { runs: LoadTest[] }) {
	const ranOn = runs[0]?.ranAt.slice(0, 'YYYY-MM-DD'.length)
	return (
		<section className={SECTION} aria-labelledby="load-test-heading">
			<h2 id="load-test-heading" className="text-text text-xl font-bold">
				Load test
			</h2>
			<p className={BODY}>
				We check that the site holds up when many people use it at once. A k6 load test signs in a
				test user and has simulated people each walk 11 pages (Home, Path, level 1, Games, a game,
				Arena, Sandbox, the start quiz, Leaderboard, Profile and this page), pausing 2 to 5 seconds
				on each one, as a reader would. Beginner mode replays come from files and Developer mode
				calls go from your browser straight to the provider, so serving pages is the server&apos;s
				main work.
			</p>
			<p className={BODY}>
				It ran on {ranOn} against the production build on one Windows PC, which ran the server and
				all the simulated people at the same time. The target is no failed requests and pages under{' '}
				{seconds(PAGE_BUDGET_MS)} for 95% of loads.
			</p>
			<div className="overflow-x-auto">
				<table className="w-full text-left text-sm">
					<caption className="text-text-muted pb-2 text-left text-sm">
						Each run ramps up for 1 minute, holds for 2 minutes, then ramps down.
					</caption>
					<thead>
						<tr>
							<th scope="col" className={HEAD_CELL}>
								People at once
							</th>
							<th scope="col" className={HEAD_CELL}>
								Pages served
							</th>
							<th scope="col" className={HEAD_CELL}>
								Failed
							</th>
							<th scope="col" className={HEAD_CELL}>
								Median page
							</th>
							<th scope="col" className={HEAD_CELL}>
								95% under
							</th>
							<th scope="col" className={HEAD_CELL}>
								Target met
							</th>
						</tr>
					</thead>
					<tbody>
						{runs.map((run) => (
							<tr key={run.peakUsers}>
								<th scope="row" className={`${CELL} font-medium`}>
									{run.peakUsers.toLocaleString('en-US')}
								</th>
								<td className={CELL}>{run.requests.toLocaleString('en-US')}</td>
								<td className={CELL}>{percent(run.failedRate)}</td>
								<td className={CELL}>{seconds(run.latencyMs.median)}</td>
								<td className={CELL}>{seconds(run.latencyMs.p95)}</td>
								<td className={CELL}>{run.thresholdsPassed ? 'Yes' : 'No, too slow'}</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>
			<p className={BODY}>
				What it shows: no request failed in any run. At 1,000 people at once, one server process on
				one PC runs out of processor time, so pages queue and slow down instead of failing. A
				deployment spreads people over several server instances, which this local test does not
				cover. The first 1,000-person run also found a real bottleneck: every page waited for one of
				only 10 database connections. We raised that to 40, which nearly tripled the pages served
				per second.
			</p>
		</section>
	)
}
