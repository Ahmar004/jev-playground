import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { SpinnerIcon } from '@/components/ui/icons'
import { LEVEL_STATUS, type LevelStatus } from '@/lib/constants'
import { ROUTES } from '@/lib/links'
import { LevelStatusLabel } from './level-status-label'

export type PathLevel = { id: string; order: number; title: string }

type PathViewProps = {
	levels: PathLevel[]
	statuses: Record<string, LevelStatus>
	pendingLevelId: string | null
	onSkip: (levelId: string) => void
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
				const canSkip = status === undefined || status === LEVEL_STATUS.inProgress
				const pending = pendingLevelId === level.id
				return (
					<li key={level.id}>
						<Card className="flex flex-wrap items-center justify-between gap-3 p-4">
							<div className="flex min-w-0 flex-col gap-1">
								<span className="text-text-muted text-sm">Level {level.order}</span>
								<span className="text-text text-lg font-semibold">{level.title}</span>
								<LevelStatusLabel status={status ?? null} />
							</div>
							<div className="flex gap-2">
								<Button asChild variant={status === undefined ? 'primary' : 'secondary'}>
									<Link href={ROUTES.level(level.id)}>{playLabel(status)}</Link>
								</Button>
								{canSkip && (
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
