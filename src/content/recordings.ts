import 'server-only'
import speedRaceOpus from '../../content/recordings/speed-race/claude-opus-5-5.json'
import speedRaceSonnet from '../../content/recordings/speed-race/claude-sonnet-5-5.json'
import speedRaceHaiku from '../../content/recordings/speed-race/claude-haiku-4-5-20251001.json'
import speedRaceJev from '../../content/recordings/speed-race/jev.json'
import datesDirectHaiku from '../../content/recordings/dates-direct/claude-haiku-4-5-20251001.json'
import datesDirectOpus from '../../content/recordings/dates-direct/claude-opus-5-5.json'
import datesDirectSonnet from '../../content/recordings/dates-direct/claude-sonnet-5-5.json'
import datesDirectJev from '../../content/recordings/dates-direct/jev.json'
import datesFixedHaiku from '../../content/recordings/dates-fixed/claude-haiku-4-5-20251001.json'
import datesFixedOpus from '../../content/recordings/dates-fixed/claude-opus-5-5.json'
import datesFixedSonnet from '../../content/recordings/dates-fixed/claude-sonnet-5-5.json'
import datesFixedJev from '../../content/recordings/dates-fixed/jev.json'
import fruitsDirectHaiku from '../../content/recordings/fruits-direct/claude-haiku-4-5-20251001.json'
import fruitsDirectOpus from '../../content/recordings/fruits-direct/claude-opus-5-5.json'
import fruitsDirectSonnet from '../../content/recordings/fruits-direct/claude-sonnet-5-5.json'
import fruitsDirectJev from '../../content/recordings/fruits-direct/jev.json'
import fruitsFixedHaiku from '../../content/recordings/fruits-fixed/claude-haiku-4-5-20251001.json'
import fruitsFixedOpus from '../../content/recordings/fruits-fixed/claude-opus-5-5.json'
import fruitsFixedSonnet from '../../content/recordings/fruits-fixed/claude-sonnet-5-5.json'
import fruitsFixedJev from '../../content/recordings/fruits-fixed/jev.json'
import howSureHaiku from '../../content/recordings/how-sure/claude-haiku-4-5-20251001.json'
import howSureOpus from '../../content/recordings/how-sure/claude-opus-5-5.json'
import howSureSonnet from '../../content/recordings/how-sure/claude-sonnet-5-5.json'
import howSureJev from '../../content/recordings/how-sure/jev.json'
import writeMeAPoemHaiku from '../../content/recordings/write-me-a-poem/claude-haiku-4-5-20251001.json'
import writeMeAPoemOpus from '../../content/recordings/write-me-a-poem/claude-opus-5-5.json'
import writeMeAPoemSonnet from '../../content/recordings/write-me-a-poem/claude-sonnet-5-5.json'
import writeMeAPoemJev from '../../content/recordings/write-me-a-poem/jev.json'
import { recordingSchema, type Recording } from './recording-schema'
import { taskHash } from './task-hash'
import { getTask } from './tasks'

// Every file in content/recordings/ is imported here. Server-only: a page's
// server component loads only its own recordings and passes them down as
// props, so recordings never ship in a shared bundle (R79).
// registry.test.ts fails when a file is missing.
const RAW_RECORDINGS: unknown[] = [
	speedRaceJev,
	speedRaceHaiku,
	speedRaceSonnet,
	speedRaceOpus,
	datesDirectHaiku,
	datesDirectOpus,
	datesDirectSonnet,
	datesDirectJev,
	datesFixedHaiku,
	datesFixedOpus,
	datesFixedSonnet,
	datesFixedJev,
	fruitsDirectHaiku,
	fruitsDirectOpus,
	fruitsDirectSonnet,
	fruitsDirectJev,
	fruitsFixedHaiku,
	fruitsFixedOpus,
	fruitsFixedSonnet,
	fruitsFixedJev,
	howSureHaiku,
	howSureOpus,
	howSureSonnet,
	howSureJev,
	writeMeAPoemHaiku,
	writeMeAPoemOpus,
	writeMeAPoemSonnet,
	writeMeAPoemJev
]

export const RECORDINGS: Recording[] = RAW_RECORDINGS.map((raw) => recordingSchema.parse(raw))

/** A task's recordings whose hash matches the current task file. */
export function currentRecordings(taskId: string): Recording[] {
	const hash = taskHash(getTask(taskId))
	return RECORDINGS.filter(
		(recording) => recording.taskId === taskId && recording.taskHash === hash
	)
}
