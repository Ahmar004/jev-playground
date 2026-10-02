'use client'

import { Button } from '@/components/ui/button'
import { PlayIcon, SkipIcon } from '@/components/ui/icons'
import { MODES, RACE_STATUS, type Mode, type RaceStatus } from '@/lib/constants'
import { RaceTrack, type RaceTrackData } from './race-track'
import { Scoreboard } from './scoreboard'

export type { RaceTrackData } from './race-track'

const STATUS_TEXT: Record<Mode, Record<RaceStatus, string>> = {
	[MODES.beginner]: {
		[RACE_STATUS.idle]: 'Ready when you are.',
		[RACE_STATUS.running]: 'Racing at the recorded speed...',
		[RACE_STATUS.finished]: 'Finished. These are the recorded numbers.'
	},
	[MODES.developer]: {
		[RACE_STATUS.idle]: 'Ready when you are. Starting makes real calls with your keys.',
		[RACE_STATUS.running]: 'Calling the models live...',
		[RACE_STATUS.finished]: 'Finished. These numbers come from live calls.'
	}
}

/** The race: one track per racer, Start / Skip to result, and the scoreboard at the end. */
export function RaceView({
	tracks,
	status,
	elapsedMs,
	lanes,
	onStart,
	onSkip,
	mode = MODES.beginner,
	idleNote
}: {
	tracks: RaceTrackData[]
	status: RaceStatus
	elapsedMs: number
	lanes: number
	onStart: () => void
	onSkip: () => void
	mode?: Mode
	// Before a live run: how many calls it will make.
	idleNote?: string
}) {
	const finished = status === RACE_STATUS.finished
	return (
		<section aria-label="Race" className="flex flex-col gap-4">
			<div className="flex flex-wrap items-center gap-3">
				{status === RACE_STATUS.running && mode === MODES.beginner ? (
					<Button type="button" variant="secondary" onClick={onSkip}>
						<SkipIcon />
						Skip to result
					</Button>
				) : (
					<Button
						type="button"
						variant={finished ? 'outline' : 'primary'}
						disabled={status === RACE_STATUS.running}
						onClick={onStart}
					>
						<PlayIcon />
						{finished ? 'Race again' : 'Start the race'}
					</Button>
				)}
				<p role="status" className="text-text-muted text-sm">
					{STATUS_TEXT[mode][status]}
					{status === RACE_STATUS.idle && idleNote ? ` ${idleNote}` : ''}
				</p>
			</div>
			<div className="grid gap-4 md:grid-cols-2">
				{tracks.map((track) => (
					<RaceTrack key={track.racer} track={track} elapsedMs={elapsedMs} lanes={lanes} />
				))}
			</div>
			{finished && (
				<Scoreboard
					caption={
						mode === MODES.developer
							? 'Final numbers from this live run'
							: 'Final numbers from the recordings'
					}
					rows={tracks.flatMap(({ racer, modelId, recordedAt, state }) =>
						state.totals ? [{ racer, modelId, recordedAt, mode, totals: state.totals }] : []
					)}
				/>
			)}
		</section>
	)
}
