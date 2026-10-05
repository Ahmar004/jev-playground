'use client'

import { useState } from 'react'
import { PlayIcon } from '@/components/ui/icons'
import type { Task } from '@/content/task-schema'
import { OUTCOME_COPY } from '@/features/levels/item-results'
import { itemOutcome } from '@/features/race/answer-text'
import type { RacerState } from '@/features/race/race-state'
import { racerName } from '@/features/race/racer-names'
import { cn } from '@/lib/cn'
import { ITEM_OUTCOMES, RACERS, type Racer } from '@/lib/constants'
import type { ItemResult } from '@/runner/types'
import { playFor, plays, type Play } from './play-data'
import { RacerBadge } from './scene-frame'

// The pieces Step-43's arena scenes share: one lane per racer with an SVG stage, a caption
// and a row of item marks. A mark replays that item in every lane, so the racers can be
// compared play by play once they have answered it.

// SVG colors per racer, as literal classes so Tailwind keeps them (R72: a name always goes with the color).
export const RACER_SVG: Record<Racer, { fill: string; stroke: string }> = {
	[RACERS.jev]: { fill: 'fill-jev', stroke: 'stroke-jev' },
	[RACERS.llm]: { fill: 'fill-llm', stroke: 'stroke-llm' },
	[RACERS.code]: { fill: 'fill-code', stroke: 'stroke-code' },
	[RACERS.jevCode]: { fill: 'fill-jev', stroke: 'stroke-jev' }
}

const TONE_SVG = {
	right: { fill: 'fill-success', stroke: 'stroke-success' },
	wrong: { fill: 'fill-danger', stroke: 'stroke-danger' },
	noAnswer: { fill: 'fill-warning', stroke: 'stroke-warning' }
} as const

/** A play's SVG color: success when right, danger when wrong, warning when it has no valid answer. */
export function toneOf(result: ItemResult) {
	const outcome = itemOutcome(result)
	if (outcome === ITEM_OUTCOMES.right) return TONE_SVG.right
	if (outcome === ITEM_OUTCOMES.wrong) return TONE_SVG.wrong
	return TONE_SVG.noAnswer
}

/** Which item the lanes show: the newest play of each racer, or one item the player picked. */
export function useReplay() {
	const [picked, setPicked] = useState<number | null>(null)
	// Bumped on every pick, so picking the same item again replays its animation.
	const [take, setTake] = useState(0)
	return {
		picked,
		take,
		pick: (index: number) => {
			setPicked(index)
			setTake((count) => count + 1)
		},
		showLatest: () => setPicked(null)
	}
}
export type Replay = ReturnType<typeof useReplay>

/** The play a lane shows: the picked item when the racer has answered it, else its newest play. */
export function shownPlay(list: readonly Play[], picked: number | null): Play | undefined {
	if (picked !== null) return playFor(list, picked)
	return list.at(-1)
}

/** The animation key of a shown play: a new key restarts its motion. */
export function playKey(play: Play, replay: Replay): string {
	return `${play.index}-${replay.picked === null ? 'live' : replay.take}`
}

/** The lanes side by side on wide screens, stacked on a phone (R73). */
export function ArenaLanes({ count, children }: { count: 2 | 3; children: React.ReactNode }) {
	return (
		<div
			className={cn('grid grid-cols-1 gap-4', count === 2 ? 'lg:grid-cols-2' : 'lg:grid-cols-3')}
		>
			{children}
		</div>
	)
}

/** One racer's lane: its name and tally, the stage, then what the shown play was. */
export function ArenaLane({
	racer,
	label,
	tally,
	thinking,
	caption,
	children
}: {
	racer: Racer
	label: string
	tally: string
	// A call is in flight: the stage shows the racer working on it.
	thinking: boolean
	caption: string | null
	children: React.ReactNode
}) {
	return (
		<section
			aria-label={`${racerName(racer)} ${label}`}
			className="border-border bg-surface-hover/40 flex min-w-0 flex-col gap-2 rounded-lg border p-3"
		>
			<div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
				<RacerBadge racer={racer} />
				<span className="text-text-muted text-sm">{tally}</span>
			</div>
			<div className="relative">
				{children}
				{thinking && (
					<span className="bg-surface text-text-muted border-border absolute top-1.5 right-1.5 rounded-full border px-2 py-0.5 text-xs font-semibold">
						Thinking...
					</span>
				)}
			</div>
			<p className="text-text min-h-10 text-sm" aria-live="polite">
				{caption ?? 'Waiting for the first answer.'}
			</p>
		</section>
	)
}

/** The scene's SVG: it scales with the lane and is decoration, so the captions carry its meaning. */
export function Stage({
	width,
	height,
	children
}: {
	width: number
	height: number
	children: React.ReactNode
}) {
	return (
		<svg
			viewBox={`0 0 ${width} ${height}`}
			className="bg-surface border-border block h-auto w-full rounded border"
			aria-hidden
			focusable="false"
		>
			{children}
		</svg>
	)
}

/**
 * One mark per item for a racer: its outcome as an icon and a word for screen readers.
 * Each answered mark is a button that replays that item in every lane.
 */
export function PlayMarks({
	task,
	racer,
	state,
	noun,
	replay
}: {
	task: Task
	racer: Racer
	state: RacerState | undefined
	noun: string
	replay: Replay
}) {
	const list = plays(task, state)
	return (
		<ol className="flex flex-wrap gap-1" aria-label={`${racerName(racer)}: every ${noun}`}>
			{task.items.map((item, index) => {
				const play = playFor(list, index)
				const number = index + 1
				if (!play) {
					return (
						<li
							key={item.id}
							className="border-border text-text-faint flex size-7 items-center justify-center rounded border border-dashed text-xs"
						>
							{number}
							<span className="sr-only">{`, ${noun} ${number} not answered yet`}</span>
						</li>
					)
				}
				const copy = OUTCOME_COPY[itemOutcome(play.result)]
				const active = replay.picked === index
				return (
					<li key={item.id}>
						<button
							type="button"
							onClick={() => replay.pick(index)}
							aria-pressed={active}
							aria-label={`Replay ${noun} ${number}: ${copy.text}`}
							className={cn(
								'border-border bg-surface text-text hover:bg-surface-hover focus-visible:ring-accent flex h-7 min-w-7 items-center justify-center gap-0.5 rounded border px-1 text-xs font-semibold focus-visible:ring-2 focus-visible:outline-none',
								active && 'border-border-strong ring-border-strong ring-1'
							)}
						>
							<copy.Icon className={copy.tone} size={12} />
							{number}
						</button>
					</li>
				)
			})}
		</ol>
	)
}

/** Above the lanes: which item is shown, and a way back to the live newest play. */
export function ReplayBar({ noun, replay }: { noun: string; replay: Replay }) {
	return (
		<div className="flex flex-wrap items-center justify-between gap-2 text-sm">
			<p className="text-text-muted inline-flex items-center gap-1.5">
				<PlayIcon size={14} />
				{replay.picked === null
					? `Showing each racer's newest ${noun}. Pick a number below a lane to replay that ${noun} in every lane.`
					: `Replaying ${noun} ${replay.picked + 1} in every lane.`}
			</p>
			{replay.picked !== null && (
				<button
					type="button"
					onClick={replay.showLatest}
					className="text-accent focus-visible:ring-accent rounded font-semibold underline-offset-2 hover:underline focus-visible:ring-2 focus-visible:outline-none"
				>
					Show the newest
				</button>
			)}
		</div>
	)
}

const CAPTION_CHARS = 90

/** An item's text cut to a length that fits a caption; the item list below the race has it in full. */
export function shortText(text: string, max = CAPTION_CHARS): string {
	const flat = text.replace(/\s+/g, ' ').trim()
	return flat.length <= max ? flat : `${flat.slice(0, max - 3).trimEnd()}...`
}
