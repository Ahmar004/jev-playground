import 'server-only'
import speedRaceOpus from '../../content/recordings/speed-race/claude-opus-5-5.json'
import speedRaceSonnet from '../../content/recordings/speed-race/claude-sonnet-5-5.json'
import speedRaceHaiku from '../../content/recordings/speed-race/claude-haiku-4-5-20251001.json'
import speedRaceJev from '../../content/recordings/speed-race/jev.json'
import { recordingSchema, type Recording } from './recording-schema'
import { taskHash } from './task-hash'
import { getTask } from './tasks'

// Every file in content/recordings/ is imported here. Server-only: a page's
// server component loads only its own recordings and passes them down as
// props, so recordings never ship in a shared bundle (R79).
// registry.test.ts fails when a file is missing.
const RAW_RECORDINGS: unknown[] = [speedRaceJev, speedRaceHaiku, speedRaceSonnet, speedRaceOpus]

export const RECORDINGS: Recording[] = RAW_RECORDINGS.map((raw) => recordingSchema.parse(raw))

/** A task's recordings whose hash matches the current task file. */
export function currentRecordings(taskId: string): Recording[] {
	const hash = taskHash(getTask(taskId))
	return RECORDINGS.filter(
		(recording) => recording.taskId === taskId && recording.taskHash === hash
	)
}
