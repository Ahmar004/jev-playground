import { Button } from '@/components/ui/button'
import { AlertIcon } from '@/components/ui/icons'
import { providerErrorMessage } from '@/features/keys/error-copy'
import { PROVIDERS, RACERS, type LlmProvider } from '@/lib/constants'
import type { RaceFailure } from './use-race'

/** A live run stopped on a failure that would repeat: what happened, Retry, and the recorded fallback (R81). */
export function LiveFailureAlert({
	failure,
	llmProvider,
	onRetry,
	onUseBeginner
}: {
	failure: RaceFailure
	llmProvider: LlmProvider
	onRetry: () => void
	onUseBeginner?: () => void
}) {
	return (
		<div
			role="alert"
			className="bg-surface border-danger text-text shadow-card flex flex-col gap-3 rounded-lg border p-4"
		>
			<p className="flex items-start gap-2">
				<AlertIcon className="text-danger mt-0.5 shrink-0" />
				<span>
					{providerErrorMessage(
						failure.kind,
						failure.racer === RACERS.llm ? llmProvider : PROVIDERS.typesafe
					)}{' '}
					The run stopped, and the results so far are kept above.
				</span>
			</p>
			<div className="flex flex-wrap gap-2">
				<Button type="button" size="sm" onClick={onRetry}>
					Retry
				</Button>
				{onUseBeginner && (
					<Button type="button" size="sm" variant="outline" onClick={onUseBeginner}>
						Use Beginner mode instead
					</Button>
				)}
			</div>
		</div>
	)
}
