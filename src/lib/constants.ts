// Every enum-like value in the app (CLAUDE.md > Writing rules). Values are the
// stored and wire forms; never repeat them as inline literals.

export const MODES = { beginner: 'beginner', developer: 'developer' } as const
export type Mode = (typeof MODES)[keyof typeof MODES]

export const PROVIDERS = {
	typesafe: 'typesafe',
	openrouter: 'openrouter',
	anthropic: 'anthropic',
	openai: 'openai',
	google: 'google'
} as const
export type Provider = (typeof PROVIDERS)[keyof typeof PROVIDERS]

// jev_code: Jev's answer passed through a Code function, shown as "Jev + Code" (DESIGN 3.2).
export const RACERS = { jev: 'jev', llm: 'llm', code: 'code', jevCode: 'jev_code' } as const
export type Racer = (typeof RACERS)[keyof typeof RACERS]

export const QUESTION_KINDS = { noul: 'noul', choice: 'choice', score: 'score' } as const
export type QuestionKind = (typeof QUESTION_KINDS)[keyof typeof QUESTION_KINDS]

// No row in LevelProgress means "not started" (DESIGN 11.1).
export const LEVEL_STATUS = {
	inProgress: 'in_progress',
	done: 'done',
	skipped: 'skipped'
} as const
export type LevelStatus = (typeof LEVEL_STATUS)[keyof typeof LEVEL_STATUS]

const LEVEL_STATUS_VALUES: readonly string[] = Object.values(LEVEL_STATUS)

/** Narrows a database string; anything unknown is not a status. */
export function isLevelStatus(value: string): value is LevelStatus {
	return LEVEL_STATUS_VALUES.includes(value)
}

const MODE_VALUES: readonly string[] = Object.values(MODES)

/** Narrows a database string; anything unknown is not a mode. */
export function isMode(value: string): value is Mode {
	return MODE_VALUES.includes(value)
}

export const CLAUDE_MODELS = {
	opus: 'claude-opus-5-5',
	sonnet: 'claude-sonnet-5-5',
	haiku: 'claude-haiku-4-5-20251001'
} as const

// Jev faces Opus 5.5 by default everywhere in Beginner mode (DESIGN 1).
export const DEFAULT_OPPONENT = CLAUDE_MODELS.opus

// Checked in the sign-up form and again by the signUp action.
export const PASSWORD_MIN_LENGTH = 8

// What a Task asks and how its answers are scored (DESIGN 3.2).
export const TASK_KINDS = {
	choice: 'choice',
	noul: 'noul',
	score: 'score',
	fanOut: 'fan_out',
	findLines: 'find_lines',
	generate: 'generate'
} as const
export type TaskKind = (typeof TASK_KINDS)[keyof typeof TASK_KINDS]

// Every provider failure maps to one of these (DESIGN 12).
export const PROVIDER_ERROR_KINDS = {
	invalidKey: 'invalid_key',
	forbidden: 'forbidden',
	rateLimited: 'rate_limited',
	overloaded: 'overloaded',
	malformed: 'malformed',
	network: 'network',
	unknown: 'unknown'
} as const
export type ProviderErrorKind = (typeof PROVIDER_ERROR_KINDS)[keyof typeof PROVIDER_ERROR_KINDS]

export const RUN_EVENTS = {
	itemStarted: 'item_started',
	itemFinished: 'item_finished',
	runFinished: 'run_finished'
} as const

// Code racer functions: item state in, answer out.
export const CODE_FN_IDS = {
	compareDates: 'compare_dates',
	sumNumbers: 'sum_numbers',
	solveProblem: 'solve_problem'
} as const
export type CodeFnId = (typeof CODE_FN_IDS)[keyof typeof CODE_FN_IDS]

// combine functions: Jev's answers in, answer out (DESIGN 3.2).
export const COMBINE_FN_IDS = {
	countTrue: 'count_true',
	compareDates: 'compare_dates',
	weightedComposite: 'weighted_composite'
} as const
export type CombineFnId = (typeof COMBINE_FN_IDS)[keyof typeof COMBINE_FN_IDS]

// Option keys for "which date comes first?" tasks.
export const DATE_ORDER = { first: 'first', second: 'second', same: 'same' } as const
export type DateOrder = (typeof DATE_ORDER)[keyof typeof DATE_ORDER]

// The key of the one question in a choice, noul or score task, and of the
// answer field in the LLM's JSON reply.
export const ANSWER_KEY = 'answer'

// The alias every Jev request sends; the response names the version that answered.
export const JEV_MODEL_ALIAS = 'jev-latest'

// Every racer gets the same number of parallel lanes (DESIGN 1).
export const RACE_LANES = 4

// A Noul at or above this counts as yes (DESIGN 3.2).
export const NOUL_THRESHOLD = 0.5

// A race's lifecycle in useRace (DESIGN 3.3).
export const RACE_STATUS = { idle: 'idle', running: 'running', finished: 'finished' } as const
export type RaceStatus = (typeof RACE_STATUS)[keyof typeof RACE_STATUS]

// The level loop (spec 6.1, R24): Learn, Predict, Play, Reveal, then Check.
export const LEVEL_STEPS = {
	learn: 'learn',
	predict: 'predict',
	play: 'play',
	reveal: 'reveal',
	check: 'check'
} as const
export type LevelStep = (typeof LEVEL_STEPS)[keyof typeof LEVEL_STEPS]
export const LEVEL_STEP_ORDER: readonly LevelStep[] = [
	LEVEL_STEPS.learn,
	LEVEL_STEPS.predict,
	LEVEL_STEPS.play,
	LEVEL_STEPS.reveal,
	LEVEL_STEPS.check
]

// What a race prediction asks: who finishes first, costs less, gets more right.
export const PREDICTION_METRICS = {
	fastest: 'fastest',
	cheapest: 'cheapest',
	mostAccurate: 'most_accurate',
	// Level 2: who hands back a finished result for every item (the runner's `correct` count).
	delivers: 'delivers'
} as const
export type PredictionMetric = (typeof PREDICTION_METRICS)[keyof typeof PREDICTION_METRICS]

// A level-specific widget, beside the shared loop (DESIGN 7).
export const LEVEL_WIDGETS = {
	calibration: 'calibration',
	weights: 'weights',
	router: 'router',
	signals: 'signals',
	tricks: 'tricks'
} as const
export type LevelWidget = (typeof LEVEL_WIDGETS)[keyof typeof LEVEL_WIDGETS]

// How Reveal marks one prediction (R25). unknown: a number needed is missing.
export const PREDICTION_OUTCOMES = {
	right: 'right',
	wrong: 'wrong',
	tie: 'tie',
	unknown: 'unknown',
	skipped: 'skipped'
} as const
export type PredictionOutcome = (typeof PREDICTION_OUTCOMES)[keyof typeof PREDICTION_OUTCOMES]

// How one item's result reads in Reveal. unparsed and failed are misses shown with raw text (R44).
export const ITEM_OUTCOMES = {
	right: 'right',
	wrong: 'wrong',
	unparsed: 'unparsed',
	failed: 'failed',
	unscored: 'unscored'
} as const
export type ItemOutcome = (typeof ITEM_OUTCOMES)[keyof typeof ITEM_OUTCOMES]

// Levels on the Path in the finished product; the pathfinder badge needs all of them (spec 6.1, DESIGN 10).
export const LEVEL_COUNT = 8

// VS games (spec 7). Each one has its own animation.
export const GAME_ANIMATIONS = {
	gate: 'gate',
	lines: 'lines',
	duel: 'duel',
	rope: 'rope'
} as const
export type GameAnimation = (typeof GAME_ANIMATIONS)[keyof typeof GAME_ANIMATIONS]

// Speed Race is also timed, so it writes Leaderboard entries (DESIGN 8).
export const SPEED_RACE_GAME_ID = 'speed-race'

// The P0 VS games; finishing all of them earns the gamer badge (DESIGN 10).
export const P0_GAME_COUNT = 4

// Level 1 is the one the first_race badge is for.
export const FIRST_LEVEL_ID = 'speed-race'

// Level 7 is the one the phish_spotter badge is for.
export const PHISH_LEVEL_ID = 'spot-the-phish'

// Correct level predictions that earn the oracle badge.
export const ORACLE_PREDICTIONS = 5

// What earns XP. XpEvent rows are unique on (user, source, sourceId) so a repeat never pays twice.
export const XP_SOURCES = {
	levelDone: 'level_done',
	checkCorrect: 'check_correct',
	predictionCorrect: 'prediction_correct',
	gameDone: 'game_done',
	quizCorrect: 'quiz_correct',
	arenaPreset: 'arena_preset',
	devFirstRun: 'dev_first_run'
} as const
export type XpSource = (typeof XP_SOURCES)[keyof typeof XP_SOURCES]

export const XP_AMOUNTS: Record<XpSource, number> = {
	[XP_SOURCES.levelDone]: 100,
	[XP_SOURCES.checkCorrect]: 20,
	[XP_SOURCES.predictionCorrect]: 25,
	[XP_SOURCES.gameDone]: 50,
	[XP_SOURCES.quizCorrect]: 10,
	[XP_SOURCES.arenaPreset]: 10,
	[XP_SOURCES.devFirstRun]: 50
}

export const BADGES = {
	firstRace: 'first_race',
	pathfinder: 'pathfinder',
	rightTool: 'right_tool',
	phishSpotter: 'phish_spotter',
	trickster: 'trickster',
	gamer: 'gamer',
	oracle: 'oracle',
	quizClimber: 'quiz_climber',
	liveWire: 'live_wire',
	sharer: 'sharer'
} as const
export type BadgeId = (typeof BADGES)[keyof typeof BADGES]

const BADGE_VALUES: readonly string[] = Object.values(BADGES)

/** Narrows a database string; anything unknown is not a badge. */
export function isBadgeId(value: string): value is BadgeId {
	return BADGE_VALUES.includes(value)
}

export const BADGE_LABELS: Record<BadgeId, { name: string; description: string }> = {
	[BADGES.firstRace]: { name: 'First Race', description: 'Finish level 1.' },
	[BADGES.pathfinder]: { name: 'Pathfinder', description: 'Finish all 8 levels.' },
	[BADGES.rightTool]: {
		name: 'Right Tool',
		description: 'Win a VS game by picking the right tool.'
	},
	[BADGES.phishSpotter]: { name: 'Phish Spotter', description: 'Finish the phishing level.' },
	[BADGES.trickster]: { name: 'Trickster', description: 'Fool Jev in the Arena.' },
	[BADGES.gamer]: { name: 'Gamer', description: 'Finish all 4 VS games.' },
	[BADGES.oracle]: { name: 'Oracle', description: 'Get 5 level predictions right.' },
	[BADGES.quizClimber]: { name: 'Quiz Climber', description: 'Climb the quiz ladder.' },
	[BADGES.liveWire]: { name: 'Live Wire', description: 'Run a live call in Developer mode.' },
	[BADGES.sharer]: { name: 'Sharer', description: 'Share a result.' }
}

// Developer mode (spec 3.4, 4). The LLM providers a user can race Jev against.
export const LLM_PROVIDERS = [
	PROVIDERS.anthropic,
	PROVIDERS.openai,
	PROVIDERS.google,
	PROVIDERS.openrouter
] as const
export type LlmProvider = (typeof LLM_PROVIDERS)[number]

export const PROVIDER_LABELS: Record<Provider, string> = {
	typesafe: 'TypeSafe (Jev)',
	openrouter: 'OpenRouter',
	anthropic: 'Anthropic',
	openai: 'OpenAI',
	google: 'Google'
}

// Where a user creates and revokes a key (R19). TypeSafe's keys are covered in its docs (R27).
export const PROVIDER_KEY_PAGES: Record<Provider, string> = {
	typesafe: 'https://docs.typesafe.ai',
	openrouter: 'https://openrouter.ai/keys',
	anthropic: 'https://platform.claude.com/settings/keys',
	openai: 'https://platform.openai.com/api-keys',
	google: 'https://aistudio.google.com/app/apikey'
}

// A failure that would repeat on every remaining call, so a live run stops there
// instead of spending the user's calls on it. A malformed answer to one item
// (level 2's rejection) is a result, not a stop.
export const RUN_STOPPING_ERRORS: readonly ProviderErrorKind[] = [
	PROVIDER_ERROR_KINDS.invalidKey,
	PROVIDER_ERROR_KINDS.forbidden,
	PROVIDER_ERROR_KINDS.rateLimited,
	PROVIDER_ERROR_KINDS.overloaded,
	PROVIDER_ERROR_KINDS.network
]
