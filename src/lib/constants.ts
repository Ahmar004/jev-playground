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

export const RACERS = { jev: 'jev', llm: 'llm', code: 'code' } as const
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
