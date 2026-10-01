import {
	answerQuestion,
	isQuestion,
	linesOf,
	type Question,
	type Structured,
	type Task,
	type TaskItem
} from '@/content/task-schema'
import { ANSWER_KEY, QUESTION_KINDS, TASK_KINDS } from '@/lib/constants'
import { jevQuestions } from './jev-request'

// One prompt per item: the same state, the same instructions and the same
// option or level set Jev gets, plus a fixed JSON answer format (R92).

const INTRO = 'Answer the question about the state below.'
const FORMAT_LEAD = 'Reply with only this JSON object and nothing else:'

function text(value: Structured): string {
	return typeof value === 'string' ? value : JSON.stringify(value, null, 2)
}

function stateSection(task: Task, item: TaskItem): string {
	const lines = task.kind === TASK_KINDS.findLines ? linesOf(item.state) : null
	const body = lines
		? lines.map((line, index) => `${index + 1}: ${line}`).join('\n')
		: text(item.state)
	return `State:\n${body}`
}

function format(answer: string): string {
	return `${FORMAT_LEAD}\n{"${ANSWER_KEY}": ${answer}}`
}

function questionSections(question: Question): string[] {
	const sections = [`Question:\n${text(question.instructions)}`]
	switch (question.type) {
		case QUESTION_KINDS.choice: {
			const options = Object.entries(question.criteria).map(([key, description]) =>
				description === null ? `- ${key}` : `- ${key}: ${text(description)}`
			)
			sections.push(`Options (answer with exactly one option key):\n${options.join('\n')}`)
			sections.push(format(`"<one of: ${Object.keys(question.criteria).join(', ')}>"`))
			break
		}
		case QUESTION_KINDS.noul: {
			const lines = ['Answer true or false.']
			if (question.criteria?.true !== undefined)
				lines.push(`true means: ${text(question.criteria.true)}`)
			if (question.criteria?.false !== undefined)
				lines.push(`false means: ${text(question.criteria.false)}`)
			sections.push(lines.join('\n'))
			sections.push(format('<true or false>'))
			break
		}
		case QUESTION_KINDS.score: {
			const levels = question.criteria.map((description, index) => `${index}: ${text(description)}`)
			sections.push(`Levels (answer with the level number):\n${levels.join('\n')}`)
			sections.push(format(`<a level number from 0 to ${question.criteria.length - 1}>`))
			break
		}
	}
	return sections
}

function bodySections(task: Task, item: TaskItem): string[] {
	switch (task.kind) {
		case TASK_KINDS.fanOut: {
			const questions = Object.entries(jevQuestions(task, item))
			const list = questions.map(([key, question]) => `- ${key}: ${text(question.instructions)}`)
			const fields = questions.map(([key]) => `"${key}": <true or false>`).join(', ')
			return [`Answer each question with true or false:\n${list.join('\n')}`, format(`{${fields}}`)]
		}
		case TASK_KINDS.findLines: {
			if (!('perLine' in task.jev)) throw new Error(`${task.id} has no perLine question`)
			return [
				`Question:\n${text(task.jev.perLine.instructions)}`,
				'The lines are numbered from 1. List the number of every line where the answer is yes.',
				format('[<line numbers>]')
			]
		}
		case TASK_KINDS.generate: {
			if (!task.llm || isQuestion(task.llm)) throw new Error(`${task.id} has no llm instructions`)
			return [`Instructions:\n${text(task.llm.instructions)}`, format('"<your text>"')]
		}
		default: {
			const question = answerQuestion(task)
			if (!question) throw new Error(`${task.id} has no answer question`)
			return questionSections(question)
		}
	}
}

export function buildLlmPrompt(task: Task, item: TaskItem): string {
	return [INTRO, stateSection(task, item), ...bodySections(task, item)].join('\n\n')
}
