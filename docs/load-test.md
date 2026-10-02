# Load test (k6, R75 and R78)

The load test checks that the local production build serves 1,000 simultaneous signed-in users without errors, with pages under 2 seconds (R75, R79). Its result is published on the Methodology page from the `load/results-<users>.json` files.

## What it does

`load/journey.js` ramps to 1,000 virtual users in 1 minute, holds them for 2 minutes, then ramps down over 30 seconds. Each user signs in with one shared test session and walks 11 pages a Beginner reaches from Home (Home, Path, level 1, Games, a game, Arena, Sandbox, the start quiz, Leaderboard, Profile, Methodology), pausing 2-5 seconds on each, as a person reading would.

It covers page reads only. Server Actions (progress, XP, shares) are not exercised, because calling one needs the build's private action ID. Developer mode is not loaded either: its model calls go from the user's browser to the provider on the user's own key.

The thresholds fail the run on more than 1% failed requests, a p95 over 2 seconds, or more than 1% of pages not served with a 200 (a redirect to sign-in counts as a failure).

## How to run it

1. Install k6 once: `winget install k6 --source winget`, or unzip the Windows build from https://github.com/grafana/k6/releases and use its `k6.exe`.
2. Build and serve the production build: `corepack pnpm build`, then `corepack pnpm start`. Nothing else should hold port 3000.
3. Create the test session: `corepack pnpm load:session`. It signs up a fresh `load+<time>@example.com` user on the local app and writes its cookies to `load/.session`, which is gitignored because it is a live session token. The session lasts an hour.
4. Run: `corepack pnpm load -e K6_VERSION=<k6 version>` for the 1,000-user run, and again with `-e PEAK_USERS=400` for the second published run. A run writes `load/results-<users>.json`; Methodology publishes the 1,000 and 400 files. For a quick smoke run use `-e PEAK_USERS=5 -e RAMP=5s -e HOLD=20s`, and delete the file it writes.
5. Rebuild so Methodology shows the new numbers, and commit the result files.

The journey and the session must target the same server, and nothing else heavy (a build, the test suite) should run during a run, or the numbers measure that instead.

k6 runs on the same PC as the server, so both compete for the CPU. Numbers from a run on a separate machine, or on Vercel, will differ.
