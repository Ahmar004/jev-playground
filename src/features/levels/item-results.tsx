import { AlertIcon, SuccessIcon, WrongIcon, InfoIcon } from '@/components/ui/icons'
import type { Task } from '@/content/task-schema'
import { answerText, itemOutcome, valueText } from '@/features/race/answer-text'
import { RacerTag } from '@/features/race/racer-tag'
import { cn } from '@/lib/cn'
import { ITEM_OUTCOMES, type ItemOutcome } from '@/lib/constants'
import type { RaceRecording } from '@/runner/combine'
import type { ItemResult } from '@/runner/types'

export const OUTCOME_COPY: Record<
	ItemOutcome,
	{ text: string; tone: string; Icon: typeof SuccessIcon }
> = {
	[ITEM_OUTCOMES.right]: { text: 'Right', tone: 'text-success', Icon: SuccessIcon },
	[ITEM_OUTCOMES.wrong]: { text: 'Wrong', tone: 'text-danger', Icon: WrongIcon },
	[ITEM_OUTCOMES.unparsed]: { text: "Couldn't parse", tone: 'text-warning', Icon: AlertIcon },
	[ITEM_OUTCOMES.failed]: { text: 'Call failed', tone: 'text-warning', Icon: AlertIcon },
	[ITEM_OUTCOMES.unscored]: { text: 'Not scored', tone: 'text-text-muted', Icon: InfoIcon }
}

function ResultCell({
	recording,
	result
}: {
	recording: RaceRecording
	result: ItemResult | undefined
}) {
	if (!result) return <p className="text-text-muted text-sm">No result recorded</p>
	const outcome = itemOutcome(result)
	const copy = OUTCOME_COPY[outcome]
	const answer = answerText(recording.racer, result)
	return (
		<div className="flex flex-col gap-1 text-sm">
			<RacerTag racer={recording.racer} modelId={recording.modelId} />
			<p className="text-text">{answer ?? 'No answer'}</p>
			<p className={cn('inline-flex items-center gap-1 font-bold', copy.tone)}>
				<copy.Icon />
				{copy.text}
			</p>
			{answer === null && (
				<p className="bg-surface-hover text-text rounded p-2 font-mono text-xs break-words whitespace-pre-wrap">
					{result.raw}
				</p>
			)}
		</div>
	)
}

/** Every item with each racer's answer. Misses that didn't parse show their raw output (R44), as plain text (R86). */
export function ItemResults({ task, recordings }: { task: Task; recordings: RaceRecording[] }) {
	const byItem = recordings.map(
		(recording) =>
			new Map<string, ItemResult>(recording.events.map((event) => [event.itemId, event]))
	)
	return (
		<details className="bg-surface border-border rounded-lg border p-4">
			<summary className="text-text focus-visible:outline-accent cursor-pointer rounded font-bold focus-visible:outline focus-visible:outline-2">
				See every item
			</summary>
			<ol className="mt-4 flex flex-col gap-4">
				{task.items.map((item, index) => (
					<li key={item.id} className="border-border flex flex-col gap-3 border-t pt-4">
						<p className="text-text">
							<span className="text-text-muted mr-2 font-bold">{index + 1}.</span>
							{valueText(item.state)}
						</p>
						<p className="text-text-muted text-sm">
							Correct answer:{' '}
							<span className="text-text font-bold">
								{item.label === undefined ? 'not scored' : valueText(item.label)}
							</span>
						</p>
						<div className="grid gap-4 sm:grid-cols-2">
							{recordings.map((recording, column) => (
								<ResultCell
									key={`${recording.racer}-${recording.modelId}`}
									recording={recording}
									result={byItem[column]?.get(item.id)}
								/>
							))}
						</div>
					</li>
				))}
			</ol>
		</details>
	)
}
