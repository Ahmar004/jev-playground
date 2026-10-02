// A small, valid level over the runner's test-choice task. Not product content (ROADMAP Rule-5).
export const testLevel = {
	id: 'test-level',
	order: 1,
	title: 'Test Race',
	learn: {
		intro: 'Two racers sort the same tickets.',
		compare: [
			{ racer: 'jev', title: 'Jev', points: ['Answers a typed question'] },
			{ racer: 'llm', title: 'An LLM', points: ['Writes its answer as text'] }
		]
	},
	predict: {
		questions: [
			{ metric: 'fastest', prompt: 'Who finishes first?' },
			{ metric: 'cheapest', prompt: 'Who costs less?' },
			{ metric: 'most_accurate', prompt: 'Who gets more right?' }
		]
	},
	tasks: [{ id: 'test-choice', title: 'Race' }],
	reveal: { why: ['Because one answers directly.'] },
	check: {
		questions: ['test-q1', 'test-q2'].map((id) => ({
			id,
			prompt: 'Which one fits?',
			options: [
				{ id: 'a', text: 'Option A' },
				{ id: 'b', text: 'Option B' },
				{ id: 'c', text: 'Option C' }
			],
			answerId: 'a',
			explanation: 'Because A.'
		}))
	},
	docs: [{ path: '/concepts/system-one', title: 'System One models' }]
}
