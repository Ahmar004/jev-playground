import { AlertIcon, InfoIcon, SuccessIcon, WrongIcon } from '@/components/ui/icons'
import type { Level } from '@/content/level-schema'
import { RacerTag } from '@/features/race/racer-tag'
import { cn } from '@/lib/cn'
import { PREDICTION_OUTCOMES, RACERS, type PredictionOutcome } from '@/lib/constants'
import type { Verdict } from './judge'

const OUTCOME_COPY: Record<
	PredictionOutcome,
	{ text: string; tone: string; Icon: typeof SuccessIcon }
> = {
	[PREDICTION_OUTCOMES.right]: { text: 'You got it', tone: 'text-success', Icon: SuccessIcon },
	[PREDICTION_OUTCOMES.wrong]: { text: 'Not this time', tone: 'text-danger', Icon: WrongIcon },
	[PREDICTION_OUTCOMES.tie]: { text: "It's a tie", tone: 'text-text-muted', Icon: InfoIcon },
	[PREDICTION_OUTCOMES.unknown]: {
		text: "Can't tell: a number is missing",
		tone: 'text-warning',
		Icon: AlertIcon
	},
	[PREDICTION_OUTCOMES.skipped]: { text: 'No prediction', tone: 'text-text-muted', Icon: InfoIcon }
}

/** Each prediction next to the real result (R25). Icons and words carry the outcome, not color alone (R90). */
export function PredictionResults({
	questions,
	verdicts,
	opponentModelId
}: {
	questions: Level['predict']['questions']
	verdicts: Verdict[]
	opponentModelId: string
}) {
	return (
		<ul aria-label="Your prediction" className="flex flex-col gap-3">
			{questions.map((question, index) => {
				const verdict = verdicts[index]
				if (!verdict) return null
				const copy = OUTCOME_COPY[verdict.outcome]
				return (
					<li
						key={question.metric}
						className="bg-surface border-border shadow-card flex flex-col gap-2 rounded-lg border p-4"
					>
						<p className="text-text font-bold">{question.prompt}</p>
						<div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
							<span className="text-text-muted">
								You picked{' '}
								{verdict.predicted ? (
									<RacerTag
										racer={verdict.predicted}
										modelId={verdict.predicted === RACERS.llm ? opponentModelId : undefined}
									/>
								) : (
									'nothing'
								)}
							</span>
							<span className="text-text-muted">
								Result:{' '}
								{verdict.winners
									? verdict.winners.map((racer) => (
											<RacerTag
												key={racer}
												racer={racer}
												modelId={racer === RACERS.llm ? opponentModelId : undefined}
												className="mr-2"
											/>
										))
									: 'unknown'}
							</span>
							<span className={cn('inline-flex items-center gap-1 font-bold', copy.tone)}>
								<copy.Icon />
								{copy.text}
							</span>
						</div>
					</li>
				)
			})}
		</ul>
	)
}
