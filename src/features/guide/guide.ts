import {
	GUIDE_PART_LIST,
	GUIDE_PARTS,
	LEVEL_STEPS,
	type GuidePart,
	type LevelStep
} from '@/lib/constants'

/**
 * One pop-up of the guide. `targets` are `data-guide` values on real page
 * elements, tried in order: the first one on screen is spotlit (the header
 * links on wide screens, the menu button on narrow ones). None means a
 * centered pop-up.
 */
export type GuideStep = {
	id: string
	targets: readonly string[]
	title: string
	body: string
}

export const GUIDE_TARGETS = {
	modeSwitch: 'mode-switch',
	headerNav: 'header-nav',
	sideNav: 'side-nav',
	pathProgress: 'path-progress',
	accountMenu: 'account-menu',
	startLevel: 'start-level',
	predict: 'predict',
	itemResults: 'item-results',
	check: 'check'
} as const

/** The welcome tour on Home: what Jev is, where things live, and the one place to start. */
export const WELCOME_TOUR: readonly GuideStep[] = [
	{
		id: 'intro',
		targets: [],
		title: "Welcome to Jev's Playground",
		body: 'Jev is a System One model: it makes fast, typed judgments. Here you race it against an LLM and plain Code, and learn which tool fits which job. This short tour shows you where to start.'
	},
	{
		id: 'mode',
		targets: [GUIDE_TARGETS.modeSwitch],
		title: 'Beginner mode needs no keys',
		body: 'You start in Beginner mode: every race replays a real Recording at its recorded speed, so it costs nothing. Developer mode runs live calls with your own API keys, whenever you want that.'
	},
	{
		id: 'sections',
		targets: [GUIDE_TARGETS.headerNav, GUIDE_TARGETS.sideNav],
		title: 'The rest can wait',
		body: 'Games, Arena, Sandbox, Quizzes and the Leaderboard live here. They make more sense after your first level, so save them for later.'
	},
	{
		id: 'path',
		targets: [GUIDE_TARGETS.pathProgress],
		title: 'Your path of short levels',
		body: 'Each Level goes Learn, Predict, Play, Reveal, Check. In Reveal, open "See every item" to see what each racer answered on every item.'
	},
	{
		id: 'account',
		targets: [GUIDE_TARGETS.accountMenu],
		title: 'Replay this tour any time',
		body: 'Your account menu has "Take the tour", and a link to your Profile with your XP and badges.'
	},
	{
		id: 'start',
		targets: [GUIDE_TARGETS.startLevel],
		title: 'Start here',
		body: 'Level 1, Speed Race, takes a few minutes. Play it first, then follow the path one level at a time.'
	}
]

export type LevelTip = GuideStep & { part: GuidePart }

const LEVEL_TIPS: Partial<Record<LevelStep, LevelTip>> = {
	[LEVEL_STEPS.predict]: {
		id: GUIDE_PARTS.predict,
		part: GUIDE_PARTS.predict,
		targets: [GUIDE_TARGETS.predict],
		title: 'Make your guess first',
		body: 'Pick who you think will win before the race runs. Reveal shows whether you were right.'
	},
	[LEVEL_STEPS.reveal]: {
		id: GUIDE_PARTS.reveal,
		part: GUIDE_PARTS.reveal,
		targets: [GUIDE_TARGETS.itemResults],
		title: 'See every item',
		body: 'Open "See every item" to see what each racer answered on every item, and which answers were right or wrong.'
	},
	[LEVEL_STEPS.check]: {
		id: GUIDE_PARTS.check,
		part: GUIDE_PARTS.check,
		targets: [GUIDE_TARGETS.check],
		title: 'Lock in what you learned',
		body: 'Answer these questions to finish the level. Then play the next level, or go back to the path.'
	}
}

/** The one-time tip for a level tab, or null when that tab has none. */
export function tipForStep(step: LevelStep): LevelTip | null {
	return LEVEL_TIPS[step] ?? null
}

/** The stored parts plus new ones, without repeats or unknown values, in GUIDE_PARTS order. */
export function mergeGuideSeen(
	current: readonly string[],
	parts: readonly GuidePart[]
): GuidePart[] {
	const all = new Set<string>([...current, ...parts])
	return GUIDE_PART_LIST.filter((part) => all.has(part))
}

export type Rect = { top: number; left: number; width: number; height: number }
export type Viewport = { width: number; height: number }
export type CardPosition =
	{ left: number; top: number | 'center' } | { left: number; bottom: number }

// Room around the spotlit element, the gap to the card, the screen gutter
// (CLAUDE.md > UI rules: 16px on phones), and the least room the card needs
// on a side before it goes there.
const SPOTLIGHT_PAD = 8
const CARD_GAP = 12
const GUTTER = 16
const MIN_CARD_SPACE = 220

function clamp(value: number, min: number, max: number): number {
	return Math.min(Math.max(value, min), max)
}

/**
 * Where the spotlight and the pop-up go: the spotlight hugs the target, clipped
 * to the screen; the card sits below the target, else above it, else docks to
 * the bottom of the screen, and is always kept inside the gutter.
 */
export function placeCard(
	target: Rect | null,
	viewport: Viewport,
	cardWidth: number
): { spotlight: Rect | null; card: CardPosition; width: number } {
	const width = Math.min(cardWidth, viewport.width - 2 * GUTTER)
	const centeredLeft = (viewport.width - width) / 2
	if (!target) return { spotlight: null, card: { left: centeredLeft, top: 'center' }, width }

	const top = Math.max(target.top - SPOTLIGHT_PAD, 0)
	const left = Math.max(target.left - SPOTLIGHT_PAD, 0)
	const bottom = Math.min(target.top + target.height + SPOTLIGHT_PAD, viewport.height)
	const right = Math.min(target.left + target.width + SPOTLIGHT_PAD, viewport.width)
	const spotlight = { top, left, width: right - left, height: bottom - top }

	const cardLeft = clamp(
		target.left + target.width / 2 - width / 2,
		GUTTER,
		viewport.width - width - GUTTER
	)
	const below = target.top + target.height + SPOTLIGHT_PAD + CARD_GAP
	const above = viewport.height - target.top + SPOTLIGHT_PAD + CARD_GAP
	if (viewport.height - below >= MIN_CARD_SPACE)
		return { spotlight, card: { left: cardLeft, top: below }, width }
	if (viewport.height - above >= MIN_CARD_SPACE)
		return { spotlight, card: { left: cardLeft, bottom: above }, width }
	return { spotlight, card: { left: cardLeft, bottom: GUTTER }, width }
}
