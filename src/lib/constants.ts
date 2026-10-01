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
export const CODE_FN_IDS = { compareDates: 'compare_dates' } as const
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

// The level loop (spec 6.1, R24). Slice 5 adds the Check step.
export const LEVEL_STEPS = {
	learn: 'learn',
	predict: 'predict',
	play: 'play',
	reveal: 'reveal'
} as const
export type LevelStep = (typeof LEVEL_STEPS)[keyof typeof LEVEL_STEPS]
export const LEVEL_STEP_ORDER: readonly LevelStep[] = [
	LEVEL_STEPS.learn,
	LEVEL_STEPS.predict,
	LEVEL_STEPS.play,
	LEVEL_STEPS.reveal
]

// What a race prediction asks: who finishes first, costs less, gets more right.
export const PREDICTION_METRICS = {
	fastest: 'fastest',
	cheapest: 'cheapest',
	mostAccurate: 'most_accurate'
} as const
export type PredictionMetric = (typeof PREDICTION_METRICS)[keyof typeof PREDICTION_METRICS]

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
