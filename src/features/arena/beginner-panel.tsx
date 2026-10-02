'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { OpponentPicker } from '@/features/race/opponent-picker'
import { DEFAULT_OPPONENT, MODES } from '@/lib/constants'
import { PendingCard, SideCard } from './side-card'
import { ShareControls } from './share-controls'
import type { ArenaPresetView, ArenaSide } from './snapshot'
import { useRecordArenaRun } from './use-arena-mutations'
import { useArenaReplay } from './use-arena-replay'

/** One preset replayed from its recordings at their recorded speed, against the chosen Claude model. */
function Replay({
	view,
	jev,
	opponent
}: {
	view: ArenaPresetView
	jev: ArenaSide
	opponent: ArenaSide
}) {
	const { record } = useRecordArenaRun()
	const sides = [jev, opponent]
	const replay = useArenaReplay(sides, () => record(view.preset.id))
	return (
		<div className="flex flex-col gap-4">
			<div className="flex flex-wrap items-center gap-3">
				<Button type="button" onClick={replay.run} disabled={replay.status === 'running'}>
					{replay.status === 'idle'
						? 'Run both'
						: replay.status === 'running'
							? 'Running...'
							: 'Run again'}
				</Button>
				<p className="text-text-muted text-sm">
					Replays real recordings: each answer appears after its recorded latency.
				</p>
			</div>
			{replay.status !== 'idle' && (
				<div className="grid gap-4 md:grid-cols-2" aria-live="polite">
					{sides.map((side) =>
						replay.shown.includes(side.racer) ? (
							<SideCard key={side.racer} side={side} mode={MODES.beginner} />
						) : (
							<PendingCard key={side.racer} racer={side.racer} modelId={side.modelId} />
						)
					)}
				</div>
			)}
			{replay.status === 'done' && (
				<div className="flex flex-col gap-3">
					{view.expected !== null && (
						<p className="text-text">
							Expected answer: <span className="font-bold wrap-anywhere">{view.expected}</span>
						</p>
					)}
					<p className="text-text-muted max-w-2xl">{view.preset.lesson}</p>
					<div>
						<ShareControls
							request={{
								mode: MODES.beginner,
								presetId: view.preset.id,
								opponentModelId: opponent.modelId
							}}
							needsConsent={false}
						/>
					</div>
				</div>
			)}
		</div>
	)
}

export function BeginnerPanel({ view }: { view: ArenaPresetView }) {
	const [chosen, setChosen] = useState<string | undefined>()
	const modelIds = view.opponents.map((side) => side.modelId)
	// Opus 5.5 by default (DESIGN 1), else the first recorded model.
	const opponentId =
		chosen && modelIds.includes(chosen)
			? chosen
			: modelIds.includes(DEFAULT_OPPONENT)
				? DEFAULT_OPPONENT
				: modelIds[0]
	const opponent = view.opponents.find((side) => side.modelId === opponentId)
	if (!view.jev || !opponent || !opponentId) {
		return (
			<p className="bg-surface border-border text-text shadow-card rounded-lg border p-4">
				This preset has not been recorded yet, so there is nothing to replay.
			</p>
		)
	}
	return (
		<div className="flex flex-col gap-4">
			<div className="flex flex-wrap items-center justify-between gap-3">
				<p className="text-text-muted">Jev answers the same question as the LLM you pick.</p>
				<OpponentPicker value={opponentId} options={modelIds} onChange={setChosen} />
			</div>
			{/* A new opponent starts a fresh replay: unmounting clears the old timers. */}
			<Replay key={opponentId} view={view} jev={view.jev} opponent={opponent} />
		</div>
	)
}
