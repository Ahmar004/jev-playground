'use client'

import { m } from 'motion/react'
import { SuccessIcon, ShieldCheckIcon, WrongIcon } from '@/components/ui/icons'
import type { Game } from '@/content/game-schema'
import type { Task, TaskItem } from '@/content/task-schema'
import type { RaceState, RacerState } from '@/features/race/race-state'
import { racerName } from '@/features/race/racer-names'
import { cn } from '@/lib/cn'
import { RACERS, type Racer } from '@/lib/constants'
import { RacerBadge, SceneFrame } from './scene-frame'
import { checkTally, latestResult, yesOf } from './scene-data'

const LANE_RACERS: readonly Racer[] = [RACERS.jev, RACERS.llm]
const SLIDE_FROM_PX = -28

type Claim = {
	index: number
	claim: string
	flagged: boolean | null
	right: boolean
	missed: boolean
}

function parts(item: TaskItem): { claim: string; source: string } | null {
	const { state } = item
	if (typeof state !== 'object' || Array.isArray(state)) return null
	const { claim, source } = state
	return typeof claim === 'string' && typeof source === 'string' ? { claim, source } : null
}

function claimsAt(task: Task, racer: Racer, state: RacerState | undefined): Claim[] {
	return (state?.results ?? []).flatMap((result): Claim[] => {
		const index = task.items.findIndex((item) => item.id === result.itemId)
		const item = task.items[index]
		const text = item ? parts(item) : null
		if (!item || !text) return []
		const said = yesOf(racer, result)
		return [
			{
				index,
				claim: text.claim,
				// Flagged means "the source does not support it"; null when the answer did not parse (R44).
				flagged: said === null ? null : !said,
				right: result.correct === true,
				// A bad citation that got waved through, or could not be judged.
				missed: item.label === false && said !== false
			}
		]
	})
}

function Chip({ claim }: { claim: Claim }) {
	return (
		<m.span
			initial={{ x: SLIDE_FROM_PX, opacity: 0 }}
			animate={{ x: 0, opacity: 1 }}
			className={cn(
				'text-text bg-surface flex min-h-8 items-center gap-1 rounded border px-1.5 text-xs font-medium',
				claim.right ? 'border-success' : 'border-danger',
				claim.missed && 'ring-danger ring-2'
			)}
			title={claim.claim}
		>
			{claim.right ? (
				<SuccessIcon className="text-success" size={14} />
			) : (
				<WrongIcon className="text-danger" size={14} />
			)}
			{claim.index + 1}
			<span className="sr-only">
				{`Claim ${claim.index + 1}, ${claim.claim}, ${claim.flagged === null ? "couldn't parse" : claim.flagged ? 'flagged' : 'waved through'}, ${claim.right ? 'right' : 'wrong'}${claim.missed ? ', a bad citation that got through' : ''}`}
			</span>
		</m.span>
	)
}

function Zone({ name, claims }: { name: string; claims: Claim[] }) {
	return (
		<div className="border-border bg-surface-hover flex min-h-16 flex-1 flex-col gap-1.5 rounded border p-2">
			<span className="text-text-muted flex justify-between text-xs font-semibold uppercase">
				{name}
				<span>{claims.length}</span>
			</span>
			<div className="flex flex-wrap gap-1.5">
				{claims.map((claim) => (
					<Chip key={claim.index} claim={claim} />
				))}
			</div>
		</div>
	)
}

function Lane({ racer, task, state }: { racer: Racer; task: Task; state: RacerState | undefined }) {
	const tally = checkTally(task, state, racer)
	const claims = claimsAt(task, racer, state)
	const latest = latestResult(state)
	const item = task.items.find((candidate) => candidate.id === latest?.itemId)
	const text = item ? parts(item) : null
	const latestClaim = claims.at(-1)
	return (
		<section aria-label={`${racerName(racer)} at the checkpoint`} className="flex flex-col gap-2">
			<div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
				<RacerBadge racer={racer} />
				<span className="text-text-muted text-sm">
					{`Bad citations flagged ${tally.caught} of ${tally.bad}`}
					{tally.missed > 0 && (
						<span className="text-danger font-semibold">{` - ${tally.missed} got through`}</span>
					)}
				</span>
			</div>
			<div className="flex items-stretch gap-2">
				<Zone name="Flagged" claims={claims.filter((claim) => claim.flagged === true)} />
				<div className="flex flex-col items-center justify-center gap-1" aria-hidden>
					<ShieldCheckIcon className="text-text-muted" size={28} />
					<span className="bg-border-strong w-1.5 flex-1 rounded" />
				</div>
				<Zone name="Waved through" claims={claims.filter((claim) => claim.flagged === false)} />
			</div>
			{claims.some((claim) => claim.flagged === null) && (
				<Zone name="No valid answer" claims={claims.filter((claim) => claim.flagged === null)} />
			)}
			{item && text && latestClaim && (
				<m.div
					key={item.id}
					initial={{ opacity: 0, y: 6 }}
					animate={{ opacity: 1, y: 0 }}
					className="text-sm"
				>
					<p className="text-text">{`Claim: "${text.claim}"`}</p>
					<p className="text-text-muted line-clamp-3">{`Source: "${text.source}"`}</p>
					<p className="text-text-muted">
						{`${latestClaim.flagged === null ? "Couldn't parse" : latestClaim.flagged ? 'Flagged' : 'Waved through'}. Right answer: ${item.label === false ? 'flag it' : 'wave it through'}.`}
					</p>
				</m.div>
			)}
		</section>
	)
}

/** Citation Cop: claims reach a checkpoint and each racer flags the ones its source does not back up. */
export function CheckpointScene({
	game,
	task,
	perRacer
}: {
	game: Game
	task: Task
	perRacer: RaceState
}) {
	return (
		<SceneFrame label={`${game.title} scene: ${game.blurb}`}>
			{LANE_RACERS.map((racer) => (
				<Lane key={racer} racer={racer} task={task} state={perRacer[racer]} />
			))}
		</SceneFrame>
	)
}
