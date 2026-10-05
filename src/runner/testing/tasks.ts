import { taskSchema, type Task, type TaskItem } from '@/content/task-schema'

// Small, valid Tasks for runner tests. Not product content (ROADMAP Rule-5).

export const choiceTask: Task = taskSchema.parse({
	id: 'test-choice',
	kind: 'choice',
	version: 1,
	jev: {
		questions: {
			answer: {
				type: 'choice',
				instructions: 'Which team should handle this ticket?',
				criteria: {
					billing: 'Payments, invoices, refunds',
					technical: 'Bugs and outages',
					sales: null
				}
			}
		}
	},
	items: [
		{ id: 't1', state: 'My invoice is wrong.', label: 'billing' },
		{ id: 't2', state: 'The app crashes on login.', label: 'technical' },
		{ id: 't3', state: 'Do you offer a team plan?' }
	]
})

export const noulTask: Task = taskSchema.parse({
	id: 'test-noul',
	kind: 'noul',
	version: 1,
	jev: {
		questions: {
			answer: {
				type: 'noul',
				instructions: 'Is the customer upset?',
				criteria: { true: 'Upset or angry', false: 'Calm' }
			}
		}
	},
	items: [
		{ id: 'n1', state: 'This is the third time it broke!', label: true },
		{ id: 'n2', state: 'Thanks for the quick fix.', label: false }
	]
})

export const scoreTask: Task = taskSchema.parse({
	id: 'test-score',
	kind: 'score',
	version: 1,
	jev: {
		questions: {
			answer: {
				type: 'score',
				instructions: 'How frustrated is the customer?',
				criteria: ['Calm', 'Annoyed', 'Angry']
			}
		}
	},
	items: [
		{ id: 's1', state: 'I want a refund NOW.', label: 2 },
		{ id: 's2', state: 'All good, thanks.', label: 0 }
	]
})

export const fanOutTask: Task = taskSchema.parse({
	id: 'test-fan-out',
	kind: 'fan_out',
	version: 1,
	jev: {
		questions: {
			urgent: { type: 'noul', instructions: 'Is it urgent?' },
			refund: { type: 'noul', instructions: 'Does it ask for a refund?' }
		}
	},
	items: [
		{ id: 'f1', state: 'Refund me now!', label: { urgent: true, refund: true } },
		{
			id: 'f2',
			state: ['apple', 'chair'],
			questions: {
				a: { type: 'noul', instructions: 'Is the first entry a fruit?' },
				b: { type: 'noul', instructions: 'Is the second entry a fruit?' }
			},
			label: { a: true, b: false }
		}
	]
})

export const findLinesTask: Task = taskSchema.parse({
	id: 'test-find-lines',
	kind: 'find_lines',
	version: 1,
	jev: { perLine: { instructions: 'Does `line` mention a deadline?' } },
	items: [
		{
			id: 'd1',
			state: ['Hello team', 'Due by Friday', 'Thanks', 'Submit before noon'],
			label: [2, 4]
		}
	]
})

export const generateTask: Task = taskSchema.parse({
	id: 'test-generate',
	kind: 'generate',
	version: 1,
	jev: { raw: { poem: { type: 'text', instructions: 'Write a 4-line poem about the state.' } } },
	llm: { instructions: 'Write a 4-line poem about the state.' },
	items: [{ id: 'g1', state: 'the sea' }]
})

export const countTask: Task = taskSchema.parse({
	id: 'test-count',
	kind: 'choice',
	version: 1,
	combine: 'count_true',
	jev: { questions: { entry: { type: 'noul', instructions: 'Is this entry a fruit?' } } },
	llm: {
		type: 'choice',
		instructions: 'How many fruits are in the list?',
		criteria: { '0': null, '1': null, '2': null, '3': null }
	},
	items: [
		{
			id: 'c1',
			state: ['apple', 'chair', 'pear'],
			questions: {
				e1: { type: 'noul', instructions: 'Is "apple" a fruit?' },
				e2: { type: 'noul', instructions: 'Is "chair" a fruit?' },
				e3: { type: 'noul', instructions: 'Is "pear" a fruit?' }
			},
			label: '2'
		}
	]
})

const DAY_OPTIONS = { '3': null, '4': null }
const MONTH_OPTIONS = { '3': null, '4': null }
const YEAR_OPTIONS = { '2024': null, '2025': null }

export const datesTask: Task = taskSchema.parse({
	id: 'test-dates',
	kind: 'choice',
	version: 1,
	combine: 'compare_dates',
	jev: {
		questions: {
			first_day: { type: 'choice', instructions: 'Day of the first date?', criteria: DAY_OPTIONS },
			first_month: {
				type: 'choice',
				instructions: 'Month of the first date?',
				criteria: MONTH_OPTIONS
			},
			first_year: {
				type: 'choice',
				instructions: 'Year of the first date?',
				criteria: YEAR_OPTIONS
			},
			second_day: {
				type: 'choice',
				instructions: 'Day of the second date?',
				criteria: DAY_OPTIONS
			},
			second_month: {
				type: 'choice',
				instructions: 'Month of the second date?',
				criteria: MONTH_OPTIONS
			},
			second_year: {
				type: 'choice',
				instructions: 'Year of the second date?',
				criteria: YEAR_OPTIONS
			}
		}
	},
	llm: {
		type: 'choice',
		instructions: 'Which date comes first?',
		criteria: { first: null, second: null, same: null }
	},
	items: [
		{ id: 'x1', state: { first: '03/04/2025, day first', second: '4 March 2025' }, label: 'same' }
	]
})

export const compositeTask: Task = taskSchema.parse({
	id: 'test-composite',
	kind: 'noul',
	version: 1,
	combine: 'weighted_composite',
	jev: {
		questions: {
			quality: { type: 'noul', instructions: 'Does it praise the quality?' },
			price: { type: 'noul', instructions: 'Does it praise the price?' }
		}
	},
	llm: { type: 'noul', instructions: 'Is this a positive product review?' },
	items: [{ id: 'r1', state: 'Great build, but far too expensive.', label: true }]
})

export const codeDatesTask: Task = taskSchema.parse({
	id: 'test-code-dates',
	kind: 'choice',
	version: 1,
	code: 'compare_dates',
	jev: {
		questions: {
			answer: {
				type: 'choice',
				instructions: 'Which date comes first?',
				criteria: { first: null, second: null, same: null }
			}
		}
	},
	items: [{ id: 'k1', state: { first: '2025-03-04', second: '2025-04-03' }, label: 'first' }]
})

/** The item with this id; throws so a typo fails the test loudly. */
export function item(task: Task, id: string): TaskItem {
	const found = task.items.find((candidate) => candidate.id === id)
	if (!found) throw new Error(`No item ${id} in ${task.id}`)
	return found
}

const dayChoices = { '1': null, '2': null, '9': null, '28': null }
const monthChoices = { '1': null, '2': null, '3': null, '9': null, '10': null }
const yearChoices = { '2025': null, '2026': null }
const windowQuestion = {
	type: 'noul',
	instructions: 'Was it sent back within 30 days of the purchase?'
} as const

// Jev answers the task's question itself (scored as Jev alone) and extracts both dates for Code.
export const windowTask: Task = taskSchema.parse({
	id: 'test-window',
	kind: 'noul',
	version: 1,
	combine: 'within_window',
	jev: {
		questions: {
			answer: windowQuestion,
			purchase_day: { type: 'choice', instructions: 'Purchase day?', criteria: dayChoices },
			purchase_month: { type: 'choice', instructions: 'Purchase month?', criteria: monthChoices },
			purchase_year: { type: 'choice', instructions: 'Purchase year?', criteria: yearChoices },
			return_day: { type: 'choice', instructions: 'Return day?', criteria: dayChoices },
			return_month: { type: 'choice', instructions: 'Return month?', criteria: monthChoices },
			return_year: { type: 'choice', instructions: 'Return year?', criteria: yearChoices }
		}
	},
	llm: windowQuestion,
	items: [{ id: 'w1', state: 'Bought 2 September 2026, returned 9 October 2026.', label: false }]
})
