import { MinusIcon, PlayIcon, SkipIcon, SuccessIcon } from '@/components/ui/icons'
import { LEVEL_STATUS, type LevelStatus } from '@/lib/constants'

const NOT_STARTED = { text: 'Not started', Icon: MinusIcon }
const STATUS_DISPLAY: Record<LevelStatus, { text: string; Icon: typeof MinusIcon }> = {
	[LEVEL_STATUS.inProgress]: { text: 'In progress', Icon: PlayIcon },
	[LEVEL_STATUS.done]: { text: 'Done', Icon: SuccessIcon },
	[LEVEL_STATUS.skipped]: { text: 'Skipped', Icon: SkipIcon }
}

/** A level's status as an icon plus text, never color alone. */
export function LevelStatusLabel({ status }: { status: LevelStatus | null }) {
	const { text, Icon } = status ? STATUS_DISPLAY[status] : NOT_STARTED
	return (
		<span className="text-text-muted inline-flex items-center gap-1.5 text-sm">
			<Icon />
			{text}
		</span>
	)
}
