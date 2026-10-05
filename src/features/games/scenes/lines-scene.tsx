'use client'

import { useState } from 'react'
import { m } from 'motion/react'
import { Button } from '@/components/ui/button'
import { SuccessIcon, WrongIcon } from '@/components/ui/icons'
import { ScrollRegion } from '@/components/ui/scroll-region'
import type { Game } from '@/content/game-schema'
import type { Task, TaskItem } from '@/content/task-schema'
import type { RaceState } from '@/features/race/race-state'
import { racerName } from '@/features/race/racer-names'
import { RACER_STYLE } from '@/features/race/racer-style'
import { cn } from '@/lib/cn'
import { RACERS, type Racer } from '@/lib/constants'
import { RacerBadge, SceneFrame } from './scene-frame'
import { latestResult, pickedLines, resultForItem } from './scene-data'

const LANE_RACERS: readonly Racer[] = [RACERS.jev, RACERS.llm]
const POP_STAGGER_S = 0.06

type Pick = {
	racer: Racer
	// This racer has answered for this document.
	done: boolean
	// The lines it picked; null when its output did not parse (R44).
	lines: number[] | null
}

function documentLines(item: TaskItem): string[] {
	return Array.isArray(item.state) ? item.state.map(String) : []
}

function needleLines(item: TaskItem): number[] {
	return Array.isArray(item.label) ? item.label.filter((line) => typeof line === 'number') : []
}

function Marker({ racer, right, order }: { racer: Racer; right: boolean; order: number }) {
	const Icon = RACER_STYLE[racer].icons[0]
	return (
		<m.span
			initial={{ scale: 0.3, opacity: 0 }}
			animate={{ scale: 1, opacity: 1 }}
			transition={{ delay: order * POP_STAGGER_S }}
			className={cn(
				'flex items-center gap-0.5 rounded border px-1 text-xs font-semibold',
				RACER_STYLE[racer].text,
				right ? 'border-success' : 'border-danger'
			)}
		>
			{Icon && <Icon size={14} />}
			{right ? (
				<SuccessIcon className="text-success" size={12} />
			) : (
				<WrongIcon className="text-danger" size={12} />
			)}
			<span className="sr-only">
				{`${racerName(racer)} picked this line, ${right ? 'a right pick' : 'a wrong pick'}`}
			</span>
		</m.span>
	)
}

/** Needle Hunt: a long document; each racer's picks light up the lines when it answers. */
export function LinesScene({
	game,
	task,
	perRacer
}: {
	game: Game
	task: Task
	perRacer: RaceState
}) {
	const [chosen, setChosen] = useState<string | null>(null)
	const followId =
		latestResult(perRacer[RACERS.jev])?.itemId ?? latestResult(perRacer[RACERS.llm])?.itemId
	const document = task.items.find((item) => item.id === (chosen ?? followId)) ?? task.items[0]
	if (!document) return null

	const lines = documentLines(document)
	const needles = needleLines(document)
	const picks: Pick[] = LANE_RACERS.map((racer) => {
		const result = resultForItem(perRacer[racer], document.id)
		return { racer, done: result !== undefined, lines: result ? pickedLines(racer, result) : null }
	})
	const anyDone = picks.some((pick) => pick.done)

	return (
		<SceneFrame label={`${game.title} scene: ${game.blurb}`}>
			<div className="flex flex-wrap items-center gap-2">
				{task.items.map((item, index) => {
					const doneRacers = LANE_RACERS.filter(
						(racer) => resultForItem(perRacer[racer], item.id) !== undefined
					)
					return (
						<Button
							key={item.id}
							type="button"
							size="sm"
							variant={item.id === document.id ? 'primary' : 'secondary'}
							aria-pressed={item.id === document.id}
							onClick={() => setChosen(item.id)}
						>
							Document {index + 1}
							{doneRacers.length > 0 && (
								<span className="text-xs font-normal">
									{`(${doneRacers.map((racer) => racerName(racer)).join(' and ')} done)`}
								</span>
							)}
						</Button>
					)
				})}
			</div>
			<div className="flex flex-wrap gap-x-5 gap-y-1 text-sm">
				{picks.map((pick) => (
					<span key={pick.racer} className="flex items-center gap-2">
						<RacerBadge racer={pick.racer} />
						<span className="text-text-muted">
							{!pick.done
								? 'reading...'
								: pick.lines === null
									? "couldn't parse"
									: `picked ${pick.lines.length} lines, ${pick.lines.filter((line) => needles.includes(line)).length} right`}
						</span>
					</span>
				))}
			</div>
			<ScrollRegion
				label={`Document ${task.items.indexOf(document) + 1} lines`}
				className="border-border max-h-80 overflow-y-auto rounded border"
			>
				<ol>
					{lines.map((text, position) => {
						const number = position + 1
						const isNeedle = anyDone && needles.includes(number)
						return (
							<li
								key={number}
								className={cn(
									'border-border flex items-start gap-2 border-b px-2 py-1 text-sm last:border-b-0',
									isNeedle && 'bg-surface-hover border-l-accent border-l-4'
								)}
							>
								<span className="text-text-faint w-6 shrink-0 text-right text-xs">{number}</span>
								<span className="text-text min-w-0 flex-1 break-words">{text}</span>
								<span className="flex shrink-0 gap-1">
									{picks.map((pick, order) =>
										pick.lines?.includes(number) ? (
											<Marker
												key={pick.racer}
												racer={pick.racer}
												right={needles.includes(number)}
												order={order}
											/>
										) : null
									)}
								</span>
							</li>
						)
					})}
				</ol>
			</ScrollRegion>
			{anyDone && needles.length > 0 && (
				<p className="text-text-muted text-sm">
					{`The accent bar marks the ${needles.length} right lines.`}
				</p>
			)}
		</SceneFrame>
	)
}
