'use client'

import { Button } from '@/components/ui/button'
import { AlertIcon } from '@/components/ui/icons'
import { PendingCard, SideCard } from '@/features/arena/side-card'
import type { ArenaSide } from '@/features/arena/snapshot'
import { providerErrorMessage } from '@/features/keys/error-copy'
import { useKeys } from '@/features/keys/keys-context'
import { useArenaReplay } from '@/features/arena/use-arena-replay'
import { MODES, PROVIDERS, RACERS } from '@/lib/constants'
import { buildSandboxTask, type SandboxDoc } from './doc'
import { useSandboxRun } from './use-sandbox-run'

/** A template replayed from its Jev recording at the recorded latency (R49). */
function Replay({ jev, lesson }: { jev: ArenaSide; lesson: string }) {
	const replay = useArenaReplay([jev], () => {})
	return (
		<div className="flex flex-col gap-3">
			<div className="flex flex-wrap items-center gap-3">
				<Button type="button" onClick={replay.run} disabled={replay.status === 'running'}>
					{replay.status === 'idle'
						? "Show Jev's answer"
						: replay.status === 'running'
							? 'Running...'
							: 'Run again'}
				</Button>
				<p className="text-text-muted text-sm">
					Replays a real recording of Jev on this template: the answer appears after its recorded
					latency.
				</p>
			</div>
			{replay.status !== 'idle' &&
				(replay.shown.length > 0 ? (
					<SideCard side={jev} mode={MODES.beginner} />
				) : (
					<PendingCard racer={RACERS.jev} modelId={jev.modelId} />
				))}
			{replay.status === 'done' && <p className="text-text-muted max-w-2xl">{lesson}</p>}
		</div>
	)
}

function BeginnerRun({
	jev,
	lesson,
	unchanged
}: {
	jev: ArenaSide | null
	lesson: string
	unchanged: boolean
}) {
	if (!jev || !unchanged) {
		return (
			<p className="bg-surface border-border text-text shadow-card rounded-lg border p-4">
				{jev
					? 'You changed this setup, so there is no recording of it. Switch to Developer mode with your TypeSafe key to run it, or reset the template to replay its recording. Everything above still works without a key: the Form, the JSON, the checks and Copy as code.'
					: 'Beginner mode replays recordings of the ready-made templates. Pick a template to see its recorded answer, or switch to Developer mode with your TypeSafe key to run your own setup.'}
			</p>
		)
	}
	return <Replay jev={jev} lesson={lesson} />
}

function DeveloperRun({ doc, blocked }: { doc: SandboxDoc; blocked: boolean }) {
	const { keys, setPanelOpen } = useKeys()
	const jevKey = keys[PROVIDERS.typesafe]
	const live = useSandboxRun(jevKey?.key)
	const built = buildSandboxTask(doc)
	if (!jevKey) {
		return (
			<div className="bg-surface border-border shadow-card flex flex-col gap-3 rounded-lg border p-4">
				<p className="text-text">
					Running your own setup needs your TypeSafe key, so Jev can answer. The key stays in this
					tab and is never saved.
				</p>
				<div>
					<Button type="button" onClick={() => setPanelOpen(true)}>
						Add your TypeSafe key
					</Button>
				</div>
			</div>
		)
	}
	return (
		<form
			className="flex flex-col gap-3"
			onSubmit={(event) => {
				event.preventDefault()
				if (built.ok && !blocked) live.run(built.task)
			}}
		>
			<div className="flex flex-wrap items-center gap-3">
				<Button type="submit" disabled={live.status === 'running' || blocked || !built.ok}>
					{live.status === 'running' ? 'Running...' : 'Run on Jev'}
				</Button>
				<p className="text-text-muted text-sm">Makes one call to Jev with your TypeSafe key.</p>
			</div>
			{!built.ok && (
				<p role="alert" className="text-danger text-sm">
					{built.error}
				</p>
			)}
			{live.failure && (
				<div
					role="alert"
					className="bg-surface border-danger text-text shadow-card flex items-start gap-2 rounded-lg border p-4"
				>
					<AlertIcon className="text-danger mt-0.5 shrink-0" />
					<span>{providerErrorMessage(live.failure, PROVIDERS.typesafe)}</span>
				</div>
			)}
			{live.status === 'running' && <PendingCard racer={RACERS.jev} modelId="Jev" />}
			{live.side && (
				<div className="flex flex-col gap-2" aria-live="polite">
					{live.malformed && (
						<p role="alert" className="text-text flex items-start gap-2 text-sm">
							<AlertIcon className="text-warning mt-0.5 shrink-0" />
							<span>
								Jev rejected this request. Check the question types, the options and the limits
								above, then try again.
							</span>
						</p>
					)}
					<SideCard side={live.side} mode={MODES.developer} />
				</div>
			)}
		</form>
	)
}

/** Beginner mode replays a template's recording; Developer mode runs the setup live with the user's TypeSafe key (R49, R50). */
export function RunPanel({
	developer,
	doc,
	jev,
	lesson,
	unchanged,
	blocked
}: {
	developer: boolean
	doc: SandboxDoc
	jev: ArenaSide | null
	lesson: string
	unchanged: boolean
	blocked: boolean
}) {
	return developer ? (
		<DeveloperRun doc={doc} blocked={blocked} />
	) : (
		<BeginnerRun jev={jev} lesson={lesson} unchanged={unchanged} />
	)
}
