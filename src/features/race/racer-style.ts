import { BrainIcon, CodeIcon, LightningIcon, type IconProps } from '@/components/ui/icons'
import { RACERS, type Racer } from '@/lib/constants'

type RacerStyle = {
	icons: ((props: IconProps) => React.JSX.Element)[]
	// Racer colors are 3:1, so they color icons and fills, never body text.
	text: string
	fill: string
	// The colored top edge of the racer's lane card.
	edge: string
}

// One color and one icon per racer, used everywhere (DESIGN 13.2, R72).
export const RACER_STYLE: Record<Racer, RacerStyle> = {
	[RACERS.jev]: { icons: [LightningIcon], text: 'text-jev', fill: 'bg-jev', edge: 'border-t-jev' },
	[RACERS.llm]: { icons: [BrainIcon], text: 'text-llm', fill: 'bg-llm', edge: 'border-t-llm' },
	[RACERS.code]: { icons: [CodeIcon], text: 'text-code', fill: 'bg-code', edge: 'border-t-code' },
	[RACERS.jevCode]: {
		icons: [LightningIcon, CodeIcon],
		text: 'text-jev',
		fill: 'bg-jev',
		edge: 'border-t-jev'
	}
}
