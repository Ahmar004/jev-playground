'use client'

import { useState } from 'react'
import type { Game } from '@/content/game-schema'
import type { Recording } from '@/content/recording-schema'
import type { Task } from '@/content/task-schema'
import { LiveRaces } from '@/features/levels/live-races'
import type { LevelStage } from '@/features/levels/lineup'
import { defaultOpponentId, raceLineup } from '@/features/levels/lineup'
import { useMode } from '@/features/mode/mode-context'
import { OpponentPicker } from '@/features/race/opponent-picker'
import { RaceStage, type RaceResult } from '@/features/race/race-stage'
import { DEFAULT_CONFIDENCE_THRESHOLD, GAME_ANIMATIONS, MODES } from '@/lib/constants'
import { GameBrief } from './game-brief'
import { GameItems } from './game-items'
import { gameRunInput } from './game-run'
import { GameScene } from './game-scene'
import { GameSummary } from './game-summary'
import { useCodeRun } from './use-code-run'
import { ThresholdPanel } from './threshold-panel'
import { useRecordGameRun } from './use-record-game-run'

/**
 * One game: what the racers are asked, the race with its animation and every item's
 * answers, then the summary. A finished run
 * is saved to the Leaderboard (the server recomputes Beginner numbers).
 */
export function GamePlay({
	game,
	task,
	recordings
}: {
	game: Game
	task: Task
	recordings: Recording[]
}) {
	const { mode, setMode } = useMode()
	const { jev, opponents } = raceLineup(recordings)
	const [opponentId, setOpponentId] = useState(() => defaultOpponentId(opponents))
	const [results, setResults] = useState<RaceResult[] | null>(null)
	const [threshold, setThreshold] = useState(DEFAULT_CONFIDENCE_THRESHOLD)
	const { record } = useRecordGameRun()
	const code = useCodeRun(task, results !== null)

	const onFinished = (finished: RaceResult[]) => {
		setResults(finished)
		const input = gameRunInput({ gameId: game.id, mode, results: finished })
		if (input) record(input)
	}
	const scene = (perRacer: Parameters<typeof GameScene>[0]['perRacer']) => (
		<GameScene game={game} task={task} perRacer={perRacer} threshold={threshold} />
	)
	const details = (perRacer: Parameters<typeof GameItems>[0]['perRacer']) => (
		<GameItems words={game.items} task={task} perRacer={perRacer} code={code?.results ?? null} />
	)
	const opponent = opponents.find((recording) => recording.modelId === opponentId)
	const stage: LevelStage = { task, title: game.title, judged: true, jev, opponents }

	if (!jev || opponents.length === 0) {
		return (
			<p className="bg-surface border-border text-text shadow-card rounded-lg border p-4">
				This game has not been recorded yet, so there is nothing to replay.
			</p>
		)
	}
	return (
		<div className="flex flex-col gap-6">
			<GameBrief words={game.items} task={task} />
			{mode === MODES.beginner && opponentId !== undefined && (
				<div className="flex flex-wrap items-center justify-between gap-3">
					<p className="text-text-muted">Replays real recordings at their recorded speed.</p>
					<OpponentPicker
						value={opponentId}
						options={opponents.map((recording) => recording.modelId)}
						onChange={(modelId) => {
							setOpponentId(modelId)
							setResults(null)
						}}
					/>
				</div>
			)}
			{mode === MODES.beginner && opponent && (
				<RaceStage
					key={opponent.modelId}
					task={task}
					jev={jev}
					opponent={opponent}
					scene={scene}
					details={details}
					onFinished={onFinished}
				/>
			)}
			{mode === MODES.developer && (
				<LiveRaces
					stages={[stage]}
					showHeadings={false}
					onUseBeginner={() => setMode(MODES.beginner)}
					scene={scene}
					details={details}
					onFinished={onFinished}
				/>
			)}
			{results && mode === MODES.beginner && game.animation === GAME_ANIMATIONS.fall && (
				<ThresholdPanel jev={jev} threshold={threshold} onThresholdChange={setThreshold} />
			)}
			{results && <GameSummary game={game} results={results} code={code?.totals ?? null} />}
		</div>
	)
}
