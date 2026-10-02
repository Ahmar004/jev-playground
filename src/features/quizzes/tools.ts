import { QUIZ_TOOLS, type QuizTool } from '@/content/quiz-schema'

export const QUIZ_TOOL_LABELS: Record<QuizTool, string> = {
	jev: 'Jev',
	llm: 'An LLM',
	code: 'Plain Code'
}

/** How many points the end quiz gained over the start quiz, or null until both are taken. */
export function improvement(start: number | null, end: number | null): number | null {
	return start === null || end === null ? null : end - start
}

/** The label for a stored pick; a pick that is not one of the three tools reads as nothing. */
export function toolLabel(pick: string | undefined): string {
	const tool = QUIZ_TOOLS.find((entry) => entry === pick)
	return tool ? QUIZ_TOOL_LABELS[tool] : 'nothing'
}
