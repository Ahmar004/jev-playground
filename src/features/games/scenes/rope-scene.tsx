'use client'

import { m } from 'motion/react'
import { SuccessIcon, WrongIcon } from '@/components/ui/icons'
import type { Game } from '@/content/game-schema'
import type { Task } from '@/content/task-schema'
import type { RaceState, RacerState } from '@/features/race/race-state'
import { racerName } from '@/features/race/racer-names'
import { RACER_STYLE } from '@/features/race/racer-style'
import { cn } from '@/lib/cn'
import { RACERS, type Racer } from '@/lib/constants'
import { RacerBadge, SceneFrame } from './scene-frame'
import { itemText, knotPosition, latestResult, scoreLevelNames, scoreOf } from './scene-data'

const PULLERS: readonly Racer[] = [RACERS.jev, RACERS.llm]
function Rating({
	racer,
	task,
	state,
	levels
}: {
	racer: Racer
	task: Task
	state: RacerState | undefined
	levels: string[]
}) {
	const result = latestResult(state)
	const item = task.items.find((candidate) => candidate.id === result?.itemId)
	if (!result || !item) {
		return <p className="text-text-muted text-sm">Waiting for the first rating.</p>
	}
	const level = scoreOf(racer, result)
	const right = result.correct === true
	const name = (index: number | null) => (index === null ? undefined : levels[index])
	const label = typeof item.label === 'number' ? item.label : null
	return (
		<m.div
			key={item.id}
			initial={{ opacity: 0, y: 8 }}
			animate={{ opacity: 1, y: 0 }}
			className={cn(
				'bg-surface-hover flex flex-col gap-1 rounded border-2 p-2 text-sm',
				right ? 'border-success' : 'border-danger'
			)}
		>
			<span className="text-text line-clamp-2">{itemText(item.state)}</span>
			<span className="flex flex-wrap items-center gap-x-3 gap-y-1">
				<span className="flex items-center gap-1 font-semibold">
					{right ? (
						<SuccessIcon className="text-success" size={16} />
					) : (
						<WrongIcon className="text-danger" size={16} />
					)}
					{level === null
						? "Couldn't parse"
						: `Rated ${name(level) ?? `level ${level}`}${right ? ', pulls' : ', no pull'}`}
				</span>
				<span className="text-text-muted">
					{label === null ? '' : `Right rating: ${name(label) ?? `level ${label}`}`}
				</span>
			</span>
		</m.div>
	)
}

/** Review Tug-of-War: each correct score pulls the knot one step toward that racer. */
export function RopeScene({
	game,
	task,
	perRacer
}: {
	game: Game
	task: Task
	perRacer: RaceState
}) {
	const jevCorrect = perRacer[RACERS.jev]?.progress.correct ?? 0
	const llmCorrect = perRacer[RACERS.llm]?.progress.correct ?? 0
	const position = knotPosition(jevCorrect, llmCorrect, task.items.length)
	const levels = scoreLevelNames(task)
	const lead = jevCorrect === llmCorrect ? 'even' : jevCorrect > llmCorrect ? 'Jev' : 'The LLM'
	return (
		<SceneFrame label={`${game.title} scene: ${game.blurb}`}>
			<div className="flex flex-wrap items-center justify-between gap-2 text-sm">
				<span className="flex items-center gap-2">
					<RacerBadge racer={RACERS.jev} />
					<span className="text-text-muted">{`${jevCorrect} pulls`}</span>
				</span>
				<span className="text-text-muted font-semibold">
					{lead === 'even' ? 'All square' : `${lead} is ahead`}
				</span>
				<span className="flex items-center gap-2">
					<span className="text-text-muted">{`${llmCorrect} pulls`}</span>
					<RacerBadge racer={RACERS.llm} />
				</span>
			</div>
			<div className="relative h-14" aria-hidden>
				<div className="bg-jev/15 absolute inset-y-0 left-0 w-[12%] rounded-l" />
				<div className="bg-llm/15 absolute inset-y-0 right-0 w-[12%] rounded-r" />
				<div className="bg-border-strong absolute inset-y-0 left-1/2 w-0.5" />
				<div className="bg-text-muted absolute inset-x-0 top-1/2 h-1.5 -translate-y-1/2 rounded-full" />
				<m.div
					className="border-surface bg-accent shadow-card absolute top-1/2 size-8 -translate-x-1/2 -translate-y-1/2 rounded-full border-4"
					initial={false}
					animate={{ left: `${position}%` }}
					transition={{ type: 'spring', stiffness: 120, damping: 14 }}
				/>
			</div>
			<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
				{PULLERS.map((racer) => (
					<section
						key={racer}
						aria-label={`${racerName(racer)}'s latest rating`}
						className="flex flex-col gap-2"
					>
						<span className={cn('text-sm font-semibold', RACER_STYLE[racer].text)}>
							{`${racerName(racer)}'s latest rating`}
						</span>
						<Rating racer={racer} task={task} state={perRacer[racer]} levels={levels} />
					</section>
				))}
			</div>
		</SceneFrame>
	)
}
