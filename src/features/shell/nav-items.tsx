import {
	ArenaIcon,
	BookIcon,
	GamesIcon,
	HomeIcon,
	type IconProps,
	MethodologyIcon,
	PathIcon,
	QuizIcon,
	SandboxIcon,
	TrophyIcon,
	UserIcon
} from '@/components/ui/icons'
import { ROUTES } from '@/lib/links'

export type NavItem = {
	href: string
	label: string
	Icon: (props: IconProps) => React.ReactNode
	// The hue behind the item's icon in the sidebar. Literal class strings,
	// so Tailwind sees them at build.
	hue: string
}

// The header links (R66), in header order.
export const HEADER_NAV: NavItem[] = [
	{ href: ROUTES.path, label: 'Path', Icon: PathIcon, hue: 'bg-accent/15 text-accent' },
	{ href: ROUTES.games, label: 'Games', Icon: GamesIcon, hue: 'bg-llm/15 text-llm' },
	{ href: ROUTES.arena, label: 'Arena', Icon: ArenaIcon, hue: 'bg-danger/15 text-danger' },
	{ href: ROUTES.sandbox, label: 'Sandbox', Icon: SandboxIcon, hue: 'bg-jev/15 text-jev' },
	{ href: ROUTES.quizzes, label: 'Quizzes', Icon: QuizIcon, hue: 'bg-warning/15 text-warning' },
	{
		href: ROUTES.leaderboard,
		label: 'Leaderboard',
		Icon: TrophyIcon,
		hue: 'bg-highlight/20 text-warning'
	},
	{ href: ROUTES.profile, label: 'Profile', Icon: UserIcon, hue: 'bg-code/15 text-code' }
]

// The sidebar lists every page: Home, the header links, then the footer ones.
export const SIDEBAR_NAV: NavItem[] = [
	{ href: ROUTES.home, label: 'Home', Icon: HomeIcon, hue: 'bg-accent/15 text-accent' },
	...HEADER_NAV,
	{ href: ROUTES.glossary, label: 'Glossary', Icon: BookIcon, hue: 'bg-jev/15 text-jev' },
	{
		href: ROUTES.methodology,
		label: 'Methodology',
		Icon: MethodologyIcon,
		hue: 'bg-llm/15 text-llm'
	}
]

/** A link is active on its own page and on the pages under it (Home only on itself). */
export function isActive(pathname: string, href: string): boolean {
	if (href === ROUTES.home) return pathname === href
	return pathname === href || pathname.startsWith(`${href}/`)
}
