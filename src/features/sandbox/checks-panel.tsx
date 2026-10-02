import { AlertIcon, CheckIcon, InfoIcon } from '@/components/ui/icons'
import type { Warning } from './checks'

/**
 * What the setup runs into before it is sent: limits that block the send
 * (R53) and known weak spots that only warn (R52). Each line has an icon and
 * words, so color is never the only signal.
 */
export function ChecksPanel({ problems, warnings }: { problems: string[]; warnings: Warning[] }) {
	return (
		<div className="flex flex-col gap-2" aria-label="Checks before sending">
			{problems.length > 0 ? (
				<ul role="alert" className="flex flex-col gap-1">
					{problems.map((problem) => (
						<li key={problem} className="text-danger flex items-start gap-2 text-sm">
							<AlertIcon className="mt-0.5 shrink-0" />
							<span>{problem}</span>
						</li>
					))}
				</ul>
			) : (
				<p className="text-text-muted flex items-start gap-2 text-sm">
					<CheckIcon className="mt-0.5 shrink-0" />
					<span>
						Within Jev&apos;s size limits. Sizes are an estimate: characters divided by 4.
					</span>
				</p>
			)}
			{warnings.length > 0 && (
				<ul className="flex flex-col gap-1">
					{warnings.map((warning) => (
						<li key={warning.id} className="text-text flex items-start gap-2 text-sm">
							<InfoIcon className="text-warning mt-0.5 shrink-0" />
							<span>{warning.message}</span>
						</li>
					))}
				</ul>
			)}
		</div>
	)
}
