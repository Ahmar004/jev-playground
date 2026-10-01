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
	taskIds: ['test-choice'],
	reveal: { why: ['Because one answers directly.'] },
	docs: [{ path: '/concepts/system-one', title: 'System One models' }]
}
