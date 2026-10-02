import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { SpinnerIcon } from '@/components/ui/icons'
import { cn } from '@/lib/cn'
import { LEVEL_STATUS, type LevelStatus } from '@/lib/constants'
import { ROUTES } from '@/lib/links'
import { canSkip } from '@/server/progress/rules'
import { LevelStatusLabel } from './level-status-label'

export type PathLevel = { id: string; order: number; title: string }

type PathViewProps = {
	levels: PathLevel[]
	statuses: Record<string, LevelStatus>
	pendingLevelId: string | null
	onSkip: (levelId: string) => void
}

// The hue of a level's number badge. The status label beside it says the
// same thing in words and an icon, so color is never the only signal.
function badgeHue(status: LevelStatus | undefined): string {
	if (status === LEVEL_STATUS.done) return 'bg-success/15 text-success ring-success/40'
	if (status === LEVEL_STATUS.inProgress) return 'bg-jev/15 text-jev ring-jev/40'
	if (status === LEVEL_STATUS.skipped) return 'bg-warning/15 text-warning ring-warning/40'
	return 'bg-llm/12 text-llm ring-llm/30'
}

function playLabel(status: LevelStatus | undefined): string {
	if (status === LEVEL_STATUS.inProgress) return 'Continue'
	if (status === LEVEL_STATUS.done || status === LEVEL_STATUS.skipped) return 'Revisit'
	return 'Play'
}

/** Every built level in order, with its status and what to do next. */
export function PathView({ levels, statuses, pendingLevelId, onSkip }: PathViewProps) {
	return (
		<ol className="flex max-w-2xl flex-col gap-3">
			{levels.map((level) => {
				const status = statuses[level.id]
				const pending = pendingLevelId === level.id
				return (
					<li key={level.id}>
						<Card className="hover:shadow-card-hover flex flex-wrap items-center justify-between gap-3 p-4 hover:-translate-y-0.5">
							<div className="flex min-w-0 items-center gap-4">
								<span
									aria-hidden
									className={cn(
										'flex size-11 shrink-0 items-center justify-center rounded-full text-lg font-extrabold ring-2',
										badgeHue(status)
									)}
								>
									{level.order}
								</span>
								<div className="flex min-w-0 flex-col gap-1">
									<span className="text-text-muted text-sm">Level {level.order}</span>
									<span className="text-text text-lg font-bold">{level.title}</span>
									<LevelStatusLabel status={status ?? null} />
								</div>
							</div>
							<div className="flex gap-2">
								<Button asChild variant={status === undefined ? 'primary' : 'secondary'}>
									<Link href={ROUTES.level(level.id)}>{playLabel(status)}</Link>
								</Button>
								{canSkip(status ?? null) && (
									<Button
										type="button"
										variant="outline"
										disabled={pending}
										onClick={() => onSkip(level.id)}
									>
										{pending ? <SpinnerIcon /> : null}
										{pending ? 'Skipping' : 'Skip'}
									</Button>
								)}
							</div>
						</Card>
					</li>
				)
			})}
		</ol>
	)
}
