'use client'

import { useState } from 'react'
import type { Recording } from '@/content/recording-schema'
import type { Task } from '@/content/task-schema'
import { LiveRaces } from '@/features/levels/live-races'
import { defaultOpponentId, raceLineup, type LevelStage } from '@/features/levels/lineup'
import { useMode } from '@/features/mode/mode-context'
import { OpponentPicker } from '@/features/race/opponent-picker'
import { RaceStage } from '@/features/race/race-stage'
import { MODES } from '@/lib/constants'

/**
 * One preset's whole task as a race (R45): Jev against an LLM over every item,
 * replayed from the recordings or run live. Nothing is saved or scored for XP.
 */
export function BatchPlay({
	task,
	recordings,
	lesson
}: {
	task: Task
	recordings: Recording[]
	lesson: string
}) {
	const { mode, setMode } = useMode()
	const { jev, opponents } = raceLineup(recordings)
	const [opponentId, setOpponentId] = useState(() => defaultOpponentId(opponents))
	const opponent = opponents.find((recording) => recording.modelId === opponentId)

	if (!jev || opponents.length === 0) {
		return (
			<p className="bg-surface border-border text-text rounded-lg border p-4">
				This task has not been recorded yet, so there is nothing to replay.
			</p>
		)
	}
	const stage: LevelStage = { task, title: task.id, judged: false, jev, opponents }
	return (
		<div className="flex flex-col gap-6">
			{mode === MODES.beginner && opponentId !== undefined && (
				<div className="flex flex-wrap items-center justify-between gap-3">
					<p className="text-text-muted">Replays real recordings at their recorded speed.</p>
					<OpponentPicker
						value={opponentId}
						options={opponents.map((recording) => recording.modelId)}
						onChange={setOpponentId}
					/>
				</div>
			)}
			{mode === MODES.beginner && opponent && (
				<RaceStage key={opponent.modelId} task={task} jev={jev} opponent={opponent} />
			)}
			{mode === MODES.developer && (
				<LiveRaces
					stages={[stage]}
					showHeadings={false}
					onUseBeginner={() => setMode(MODES.beginner)}
				/>
			)}
			<p className="bg-surface border-border text-text rounded-lg border p-4">{lesson}</p>
		</div>
	)
}
