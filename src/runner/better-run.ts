// Leaderboard rules (DESIGN 10): a run replaces a stored result only when its
// accuracy is higher, or equal with a lower time. Pure, so it is unit tested.
export type RunResult = { accuracy: number; wallMs: number }

export function isBetterRun(stored: RunResult, run: RunResult): boolean {
	return (
		run.accuracy > stored.accuracy ||
		(run.accuracy === stored.accuracy && run.wallMs < stored.wallMs)
	)
}
